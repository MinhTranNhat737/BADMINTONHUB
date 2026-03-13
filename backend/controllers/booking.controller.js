// ═══════════════════════════════════════════════════════════════
// Controller: Bookings
// ═══════════════════════════════════════════════════════════════
const Booking = require('../models/booking.model');
const { success, created, paginated } = require('../utils/response');

// GET /api/bookings (admin)
const getAll = async (req, res, next) => {
  try {
    const { status, branchId, courtId, date, phone, page = 1, limit = 20 } = req.query;
    const result = await Booking.findAll({
      status, branchId: branchId ? parseInt(branchId) : undefined,
      courtId: courtId ? parseInt(courtId) : undefined,
      date, phone,
      page: parseInt(page), limit: parseInt(limit)
    });
    return paginated(res, { ...result, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

// GET /api/bookings/my (user)
const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.findByUser(req.user.id);
    return success(res, bookings);
  } catch (err) { next(err); }
};

// GET /api/bookings/:id
const getById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy booking' });
    return success(res, booking);
  } catch (err) { next(err); }
};

// POST /api/bookings
const create = async (req, res, next) => {
  try {
    const data = { ...req.body };
    // Admin/employee can specify user_id to book on behalf of a customer
    if (data.user_id && ['admin', 'employee'].includes(req.user?.role)) {
      // keep the provided user_id
    } else if (req.user) {
      data.user_id = req.user.id;
    }

    // Reject bookings for past time slots
    if (data.booking_date && data.time_start) {
      const now = new Date();
      const [year, month, day] = data.booking_date.split('-').map(Number);
      const startHour = parseInt(data.time_start.split(':')[0]);
      const slotStart = new Date(year, month - 1, day, startHour, 0, 0);
      if (slotStart <= now) {
        return res.status(400).json({
          success: false,
          message: 'Không thể đặt sân cho khung giờ đã qua'
        });
      }
    }

    const booking = await Booking.create(data);
    return created(res, booking, 'Đặt sân thành công');
  } catch (err) { next(err); }
};

// POST /api/bookings/recurring — Đặt lịch cố định hàng tuần (đội cố định)
const createRecurring = async (req, res, next) => {
  try {
    const { court_id, time_start, time_end, slots, customer_name, customer_phone,
            amount, payment_method, note, start_date, weeks, user_id } = req.body;

    if (!court_id || !time_start || !time_end || !start_date || !weeks) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    }

    const numWeeks = Math.min(parseInt(weeks) || 4, 12); // max 12 weeks
    const results = [];
    const errors = [];
    const now = new Date();

    for (let w = 0; w < numWeeks; w++) {
      const [y, m, d] = start_date.split('-').map(Number);
      const bookingDate = new Date(y, m - 1, d);
      bookingDate.setDate(bookingDate.getDate() + w * 7);

      const dateStr = `${bookingDate.getFullYear()}-${String(bookingDate.getMonth() + 1).padStart(2, '0')}-${String(bookingDate.getDate()).padStart(2, '0')}`;

      // Skip past dates
      const startHour = parseInt(time_start.split(':')[0]);
      const slotStart = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate(), startHour, 0, 0);
      if (slotStart <= now) {
        errors.push({ date: dateStr, message: 'Khung giờ đã qua' });
        continue;
      }

      try {
        const data = {
          court_id, booking_date: dateStr,
          time_start, time_end,
          slots: slots || 1,
          customer_name: customer_name || 'Đội cố định',
          customer_phone: customer_phone || '',
          amount: amount || 0,
          payment_method, note: note ? `${note} (Tuần ${w + 1}/${numWeeks})` : `Lịch cố định - Tuần ${w + 1}/${numWeeks}`,
        };
        // Admin/employee can specify user_id for booking on behalf of customer
        if (user_id && ['admin', 'employee'].includes(req.user?.role)) {
          data.user_id = user_id;
        } else if (req.user) {
          data.user_id = req.user.id;
        }

        const booking = await Booking.create(data);
        results.push(booking);
      } catch (err) {
        errors.push({ date: dateStr, message: err.message || 'Lỗi tạo booking' });
      }
    }

    return res.json({
      success: true,
      message: `Đã tạo ${results.length}/${numWeeks} booking lịch cố định`,
      data: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) { next(err); }
};

// PATCH /api/bookings/:id/status
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'hold', 'playing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    }
    const booking = await Booking.updateStatus(req.params.id, status);
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy booking' });
    return success(res, booking, 'Cập nhật trạng thái thành công');
  } catch (err) { next(err); }
};

// POST /api/bookings/hold — Giữ chỗ khi khách đang thanh toán
const createHold = async (req, res, next) => {
  try {
    const data = { ...req.body, status: 'hold' };
    if (req.user) data.user_id = req.user.id;

    // Reject holds for past time slots
    if (data.booking_date && data.time_start) {
      const now = new Date();
      const [year, month, day] = data.booking_date.split('-').map(Number);
      const startHour = parseInt(data.time_start.split(':')[0]);
      const slotStart = new Date(year, month - 1, day, startHour, 0, 0);
      if (slotStart <= now) {
        return res.status(400).json({ success: false, message: 'Không thể giữ chỗ cho khung giờ đã qua' });
      }
    }

    const booking = await Booking.create(data);
    return created(res, booking, 'Đã giữ chỗ — vui lòng thanh toán trong 10 phút');
  } catch (err) { next(err); }
};

// PATCH /api/bookings/:id/confirm-payment — Xác nhận thanh toán (hold → confirmed)
const confirmPayment = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy booking' });

    if (booking.status !== 'hold' && booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Không thể xác nhận thanh toán cho booking ${booking.status}` });
    }

    const updated = await Booking.updateStatus(req.params.id, 'confirmed');
    return success(res, updated, 'Xác nhận thanh toán thành công — booking đã được xác nhận');
  } catch (err) { next(err); }
};

// PATCH /api/bookings/:id/reschedule
const reschedule = async (req, res, next) => {
  try {
    const { booking_date, time_start, time_end, amount } = req.body;
    if (!booking_date || !time_start || !time_end) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin ngày/giờ mới' });
    }

    // Reject rescheduling to past time slots
    const now = new Date();
    const [year, month, day] = booking_date.split('-').map(Number);
    const startHour = parseInt(time_start.split(':')[0]);
    const slotStart = new Date(year, month - 1, day, startHour, 0, 0);
    if (slotStart <= now) {
      return res.status(400).json({ success: false, message: 'Không thể đổi sang khung giờ đã qua' });
    }

    const booking = await Booking.reschedule(req.params.id, { booking_date, time_start, time_end, amount });
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy booking' });
    return success(res, booking, 'Đổi lịch thành công');
  } catch (err) { next(err); }
};

// DELETE /api/bookings/:id
const deleteBooking = async (req, res, next) => {
  try {
    const result = await Booking.deleteById(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Không tìm thấy booking' });
    return success(res, null, 'Xoá booking thành công');
  } catch (err) { next(err); }
};

// POST /api/bookings/checkin — QR check-in
const checkin = async (req, res, next) => {
  try {
    const { bookingId, bookingCode } = req.body;
    let booking = null;
    // Only use findById if bookingId looks like a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (bookingId && uuidRegex.test(bookingId)) {
      booking = await Booking.findById(bookingId);
    }
    // Fallback: try by code (bookingCode or bookingId if it's not a UUID)
    if (!booking && bookingCode) {
      booking = await Booking.findByCode(bookingCode);
    }
    if (!booking && bookingId && !uuidRegex.test(bookingId)) {
      booking = await Booking.findByCode(bookingId);
    }
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy booking' });

    if (booking.status === 'playing') {
      return res.status(400).json({ success: false, message: 'Booking đã check-in rồi' });
    }
    if (booking.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Booking đã hoàn thành' });
    }
    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Booking đã bị huỷ' });
    }

    const updated = await Booking.updateStatus(booking.id, 'playing');
    return success(res, updated, 'Check-in thành công!');
  } catch (err) { next(err); }
};

module.exports = { getAll, getMyBookings, getById, create, createRecurring, createHold, confirmPayment, updateStatus, reschedule, deleteBooking, checkin };