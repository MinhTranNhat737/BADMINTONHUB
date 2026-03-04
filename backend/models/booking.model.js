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

      const { court_id, user_id, booking_date, day_label, time_start, time_end,
              people, amount, payment_method, customer_name, customer_phone, customer_email, status = 'confirmed' } = data;

      // Tự động lấy branch_id từ court nếu frontend không gửi
      let branch_id = data.branch_id;
      if (!branch_id && court_id) {
        const courtRow = await client.query('SELECT branch_id FROM courts WHERE id = $1', [court_id]);
        if (courtRow.rows.length > 0) branch_id = courtRow.rows[0].branch_id;
      }
      if (!branch_id) throw { statusCode: 400, message: 'Không xác định được chi nhánh' };

      // Kiểm tra slot trống
      const slotCheck = await client.query(
        `SELECT id FROM court_slots WHERE court_id = $1 AND slot_date = $2 AND time >= $3 AND time < $4 AND status = 'booked'`,
        [court_id, booking_date, time_start, time_end]
      );
      if (slotCheck.rows.length > 0) {
        throw { statusCode: 409, message: 'Khung giờ đã được đặt' };
      }

      // Tạo booking
      const sql = `INSERT INTO bookings (court_id, branch_id, user_id, booking_date, day_label, time_start, time_end,
                   people, amount, payment_method, customer_name, customer_phone, customer_email, status)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`;
      const result = await client.query(sql, [court_id, branch_id, user_id, booking_date, day_label,
        time_start, time_end, people, amount, payment_method, customer_name, customer_phone, customer_email, status]);

      // Trigger trg_book_court_slot sẽ tự tạo court_slots nếu status = 'confirmed'

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
    const sql = `UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`;
    const result = await query(sql, [status, id]);
    return result.rows[0] || null;
  },

  // Lấy slots đã đặt của 1 sân trong 1 ngày
  getSlots: async (courtId, date) => {
    const sql = `SELECT * FROM court_slots WHERE court_id = $1 AND slot_date = $2 ORDER BY time`;
    const result = await query(sql, [courtId, date]);
    return result.rows;
  },

  // Xoá booking
  deleteById: async (id) => {
    const sql = `DELETE FROM bookings WHERE id = $1 RETURNING id`;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }
};

module.exports = Booking;
