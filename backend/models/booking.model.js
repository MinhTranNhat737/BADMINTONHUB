// ═══════════════════════════════════════════════════════════════
// Model: Bookings (bookings + court_slots)
// ═══════════════════════════════════════════════════════════════
const { query, getClient } = require('../config/database');

const Booking = {
  // Lấy danh sách booking (admin — có filter)
  findAll: async ({ status, branchId, courtId, date, phone, page = 1, limit = 20 } = {}) => {
    let where = ['TRUE'];
    const values = [];
    let idx = 1;

    if (status)   { where.push(`bk.status = $${idx++}`); values.push(status); }
    if (branchId) { where.push(`bk.branch_id = $${idx++}`); values.push(branchId); }
    if (courtId)  { where.push(`bk.court_id = $${idx++}`); values.push(courtId); }
    if (date)     { where.push(`bk.booking_date = $${idx++}`); values.push(date); }
    if (phone)    { where.push(`bk.customer_phone = $${idx++}`); values.push(phone); }

    const whereClause = where.join(' AND ');

    // Count
    const countResult = await query(`SELECT COUNT(*) FROM bookings bk WHERE ${whereClause}`, values);
    const total = parseInt(countResult.rows[0].count);

    // Data
    let sql = `SELECT bk.*, c.name AS court_name, br.name AS branch_name
               FROM bookings bk
               JOIN courts c ON c.id = bk.court_id
               JOIN branches br ON br.id = bk.branch_id
               WHERE ${whereClause}
               ORDER BY bk.booking_date DESC, bk.time_start`;
    sql += ` LIMIT $${idx} OFFSET $${idx + 1}`;
    values.push(limit, (page - 1) * limit);

    const result = await query(sql, values);
    return { data: result.rows, total };
  },

  // Lấy 1 booking
  findById: async (id) => {
    const sql = `SELECT bk.*, c.name AS court_name, br.name AS branch_name
                 FROM bookings bk
                 JOIN courts c ON c.id = bk.court_id
                 JOIN branches br ON br.id = bk.branch_id
                 WHERE bk.id = $1`;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  },

  // Lấy bookings của 1 user
  findByUser: async (userId) => {
    const sql = `SELECT bk.*, c.name AS court_name, br.name AS branch_name
                 FROM bookings bk
                 JOIN courts c ON c.id = bk.court_id
                 JOIN branches br ON br.id = bk.branch_id
                 WHERE bk.user_id = $1
                 ORDER BY bk.booking_date DESC, bk.time_start`;
    const result = await query(sql, [userId]);
    return result.rows;
  },

  // Tạo booking mới (dùng transaction)
  create: async (data) => {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const { court_id, user_id, booking_date, time_start, time_end,
              people = 1, amount, payment_method, customer_name, customer_phone, customer_email, status = 'confirmed' } = data;

      // Tự động tính day_label từ booking_date nếu frontend không gửi (vd: "4/3")
      let day_label = data.day_label;
      if (!day_label && booking_date) {
        const d = new Date(booking_date);
        day_label = `${d.getDate()}/${d.getMonth() + 1}`;
      }

      // Tự động lấy branch_id từ court nếu frontend không gửi
      let branch_id = data.branch_id;
      if (!branch_id && court_id) {
        const courtRow = await client.query('SELECT branch_id FROM courts WHERE id = $1', [court_id]);
        if (courtRow.rows.length > 0) branch_id = courtRow.rows[0].branch_id;
      }
      if (!branch_id) throw { statusCode: 400, message: 'Không xác định được chi nhánh' };

      // Kiểm tra slot trống (cả booked và hold đều chặn)
      const slotCheck = await client.query(
        `SELECT id FROM court_slots WHERE court_id = $1 AND slot_date = $2 AND time >= $3 AND time < $4 AND status IN ('booked', 'hold')`,
        [court_id, booking_date, time_start, time_end]
      );
      if (slotCheck.rows.length > 0) {
        throw { statusCode: 409, message: 'Khung giờ đã được đặt hoặc đang giữ chỗ' };
      }

      // Sinh mã đặt sân: MB-DDMMYY-HHMM-KHxxx##
      const bd = new Date(booking_date);
      const dd = String(bd.getDate()).padStart(2, '0');
      const mm = String(bd.getMonth() + 1).padStart(2, '0');
      const yy = String(bd.getFullYear()).slice(-2);
      const hh = (time_start || '00:00').replace(':', '');
      // Lấy mã khách hàng từ user_code (VD: KH001), fallback 3 số cuối phone
      let khCode = '000';
      if (user_id) {
        const userRow = await client.query('SELECT user_code FROM users WHERE id = $1', [user_id]);
        if (userRow.rows.length > 0 && userRow.rows[0].user_code) {
          khCode = userRow.rows[0].user_code;
        } else {
          khCode = 'KH' + String(user_id).slice(-3);
        }
      } else if (customer_phone) {
        khCode = 'KH' + customer_phone.slice(-3);
      }
      // Đếm số booking cùng ngày để tránh trùng
      const countRes = await client.query(
        `SELECT COUNT(*) as cnt FROM bookings WHERE booking_date = $1`,
        [booking_date]
      );
      const seq = String(parseInt(countRes.rows[0].cnt) + 1).padStart(2, '0');
      const booking_code = `MB-${dd}${mm}${yy}-${hh}-${khCode}${seq}`;

      // Tạo booking
      const sql = `INSERT INTO bookings (court_id, branch_id, user_id, booking_date, day_label, time_start, time_end,
                   people, amount, payment_method, customer_name, customer_phone, customer_email, status, booking_code)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`;
      const result = await client.query(sql, [court_id, branch_id, user_id, booking_date, day_label,
        time_start, time_end, people, amount, payment_method, customer_name, customer_phone, customer_email, status, booking_code]);

      // Trigger trg_book_court_slot sẽ tự tạo court_slots nếu status = 'confirmed'
      // Nếu status = 'hold', tạo court_slots thủ công với status = 'hold'
      if (status === 'hold') {
        const startHour = parseInt(time_start.split(':')[0]);
        const endHour = parseInt(time_end.split(':')[0]);
        for (let h = startHour; h < endHour; h++) {
          const slotTime = h.toString().padStart(2, '0') + ':00';
          await client.query(
            `INSERT INTO court_slots (court_id, slot_date, date_label, time, status, booked_by, phone, booking_id)
             VALUES ($1, $2, $3, $4, 'hold', $5, $6, $7)
             ON CONFLICT (court_id, slot_date, time) DO UPDATE SET status = 'hold', booked_by = $5, phone = $6, booking_id = $7`,
            [court_id, booking_date, day_label, slotTime, customer_name, customer_phone, result.rows[0].id]
          );
        }
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // Cập nhật trạng thái
  updateStatus: async (id, status) => {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const sql = `UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`;
      const result = await client.query(sql, [status, id]);
      const booking = result.rows[0];
      if (!booking) { await client.query('ROLLBACK'); return null; }

      // Khi chuyển từ hold → confirmed: cập nhật court_slots thành 'booked'
      if (status === 'confirmed' && booking) {
        await client.query(
          `UPDATE court_slots SET status = 'booked' WHERE booking_id = $1`,
          [id]
        );
        // Nếu chưa có court_slots (ví dụ hold bị expire rồi tạo lại), tạo mới
        const existingSlots = await client.query(`SELECT id FROM court_slots WHERE booking_id = $1`, [id]);
        if (existingSlots.rows.length === 0) {
          const startHour = parseInt(booking.time_start.split(':')[0]);
          const endHour = parseInt(booking.time_end.split(':')[0]);
          const dayLabel = `${new Date(booking.booking_date).getDate()}/${new Date(booking.booking_date).getMonth() + 1}`;
          for (let h = startHour; h < endHour; h++) {
            const slotTime = h.toString().padStart(2, '0') + ':00';
            await client.query(
              `INSERT INTO court_slots (court_id, slot_date, date_label, time, status, booked_by, phone, booking_id)
               VALUES ($1, $2, $3, $4, 'booked', $5, $6, $7)
               ON CONFLICT (court_id, slot_date, time) DO UPDATE SET status = 'booked', booked_by = $5, phone = $6, booking_id = $7`,
              [booking.court_id, booking.booking_date, dayLabel, slotTime, booking.customer_name, booking.customer_phone, id]
            );
          }
        }
      }

      // Khi cancel: trigger sẽ xoá court_slots
      await client.query('COMMIT');
      return booking;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // Xoá các hold đã hết hạn (> 10 phút)
  expireHolds: async () => {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      // Tìm các booking hold đã quá 10 phút
      const expired = await client.query(
        `SELECT id, booking_code FROM bookings
         WHERE status = 'hold' AND created_at < NOW() - INTERVAL '10 minutes'`
      );
      for (const row of expired.rows) {
        await client.query(`DELETE FROM court_slots WHERE booking_id = $1`, [row.id]);
        await client.query(`UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [row.id]);
      }
      await client.query('COMMIT');
      return expired.rows;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // Lấy slots đã đặt của 1 sân trong 1 ngày
  getSlots: async (courtId, date) => {
    const sql = `SELECT * FROM court_slots WHERE court_id = $1 AND slot_date = $2 ORDER BY time`;
    const result = await query(sql, [courtId, date]);
    return result.rows;
  },

  // Xoá booking (xóa court_slots trước do FK constraint)
  deleteById: async (id) => {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM court_slots WHERE booking_id = $1', [id]);
      const result = await client.query('DELETE FROM bookings WHERE id = $1 RETURNING id', [id]);
      await client.query('COMMIT');
      return result.rows[0] || null;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // Tìm booking theo booking_code
  findByCode: async (code) => {
    const sql = `SELECT bk.*, c.name AS court_name, br.name AS branch_name
                 FROM bookings bk
                 JOIN courts c ON c.id = bk.court_id
                 JOIN branches br ON br.id = bk.branch_id
                 WHERE bk.booking_code = $1`;
    const result = await query(sql, [code]);
    return result.rows[0] || null;
  },

  // Đổi lịch booking (reschedule)
  reschedule: async (id, { booking_date, time_start, time_end, amount }) => {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Lấy booking hiện tại
      const existing = await client.query(
        `SELECT * FROM bookings WHERE id = $1 AND status IN ('confirmed', 'pending')`, [id]
      );
      if (existing.rows.length === 0) {
        throw { statusCode: 400, message: 'Booking không tồn tại hoặc không thể đổi lịch' };
      }
      const booking = existing.rows[0];

      // Xoá court_slots cũ
      await client.query('DELETE FROM court_slots WHERE booking_id = $1', [id]);

      // Kiểm tra slot mới có trống không
      const slotCheck = await client.query(
        `SELECT id FROM court_slots WHERE court_id = $1 AND slot_date = $2 AND time >= $3 AND time < $4 AND status IN ('booked', 'hold')`,
        [booking.court_id, booking_date, time_start, time_end]
      );
      if (slotCheck.rows.length > 0) {
        // Rollback — khôi phục slot cũ sẽ được tạo lại khi ROLLBACK
        throw { statusCode: 409, message: 'Khung giờ mới đã được đặt hoặc đang giữ chỗ' };
      }

      // Cập nhật booking
      const updateSql = `UPDATE bookings SET booking_date = $1, time_start = $2, time_end = $3, amount = $4, updated_at = NOW()
                         WHERE id = $5 RETURNING *`;
      const updateResult = await client.query(updateSql, [booking_date, time_start, time_end, amount || booking.amount, id]);
      const updated = updateResult.rows[0];

      // Tạo court_slots mới
      const startHour = parseInt(time_start.split(':')[0]);
      const endHour = parseInt(time_end.split(':')[0]);
      const d = new Date(booking_date);
      const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
      for (let h = startHour; h < endHour; h++) {
        const slotTime = h.toString().padStart(2, '0') + ':00';
        await client.query(
          `INSERT INTO court_slots (court_id, slot_date, date_label, time, status, booked_by, phone, booking_id)
           VALUES ($1, $2, $3, $4, 'booked', $5, $6, $7)
           ON CONFLICT (court_id, slot_date, time) DO UPDATE SET status = 'booked', booked_by = $5, phone = $6, booking_id = $7`,
          [booking.court_id, booking_date, dayLabel, slotTime, booking.customer_name, booking.customer_phone, id]
        );
      }

      await client.query('COMMIT');

      // Trả về booking kèm court_name, branch_name
      const fullBooking = await query(
        `SELECT bk.*, c.name AS court_name, br.name AS branch_name
         FROM bookings bk JOIN courts c ON c.id = bk.court_id JOIN branches br ON br.id = bk.branch_id
         WHERE bk.id = $1`, [id]
      );
      return fullBooking.rows[0] || updated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // Tự động hoàn thành các booking đang chơi đã hết giờ
  autoComplete: async () => {
    const sql = `UPDATE bookings
                 SET status = 'completed', updated_at = NOW()
                 WHERE status = 'playing'
                   AND booking_date + time_end::interval <= NOW()
                 RETURNING id, booking_code, time_end`;
    const result = await query(sql);
    return result.rows;
  }
};

module.exports = Booking;
