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
    if (req.user) data.user_id = req.user.id;
    const booking = await Booking.create(data);
    return created(res, booking, 'Đặt sân thành công');
  } catch (err) { next(err); }
};

// PATCH /api/bookings/:id/status
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'playing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    }
    const booking = await Booking.updateStatus(req.params.id, status);
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy booking' });
    return success(res, booking, 'Cập nhật trạng thái thành công');
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

module.exports = { getAll, getMyBookings, getById, create, updateStatus, deleteBooking };