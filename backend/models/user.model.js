// ═══════════════════════════════════════════════════════════════
// Model: Users (users)
// ═══════════════════════════════════════════════════════════════
const { query } = require('../config/database');

const User = {
  // Tìm theo ID
  findById: async (id) => {
    const sql = `SELECT id, user_code, username, full_name, email, phone, address, gender, 
                        date_of_birth, role, warehouse_id, created_at, updated_at
                 FROM users WHERE id = $1`;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  },

  // Tìm theo username (dùng khi đăng nhập — cần password_hash)
  findByUsername: async (username) => {
    const sql = `SELECT * FROM users WHERE username = $1`;
    const result = await query(sql, [username]);
    return result.rows[0] || null;
  },

  // Tìm theo email
  findByEmail: async (email) => {
    const sql = `SELECT id, username, email FROM users WHERE email = $1`;
    const result = await query(sql, [email]);
    return result.rows[0] || null;
  },

  // Tìm theo phone
  findByPhone: async (phone) => {
    const sql = `SELECT id, username, phone FROM users WHERE phone = $1`;
    const result = await query(sql, [phone]);
    return result.rows[0] || null;
  },

  // Tra cứu khách hàng theo số điện thoại (partial/exact)
  findCustomersByPhone: async (phone, limit = 8) => {
    const sql = `SELECT id, user_code, full_name, phone, email, role
                 FROM users
                 WHERE role IN ('user', 'guest')
                   AND phone ILIKE $1
                 ORDER BY
                   CASE WHEN phone = $2 THEN 0 ELSE 1 END,
                   created_at DESC
                 LIMIT $3`;
    const result = await query(sql, [`%${phone}%`, phone, limit]);
    return result.rows;
  },

  // Sinh mã user tự động: NV001, KH001, AD001
  generateUserCode: async (role) => {
    const prefixMap = { admin: 'AD', employee: 'NV', user: 'KH', guest: 'GS' };
    const prefix = prefixMap[role] || 'KH';
    const countRes = await query(`SELECT COUNT(*) as cnt FROM users WHERE role = $1`, [role]);
    const seq = parseInt(countRes.rows[0].cnt) + 1;
    return `${prefix}${String(seq).padStart(3, '0')}`;
  },

  // Tạo user mới (đăng ký)
  create: async ({ username, password_hash, full_name, email, phone, address, gender, date_of_birth, role = 'user', warehouse_id = null, user_code = null }) => {
    // Tự sinh mã nếu chưa có
    if (!user_code) {
      user_code = await User.generateUserCode(role);
    }
    const sql = `INSERT INTO users (username, password_hash, full_name, email, phone, address, gender, date_of_birth, role, warehouse_id, user_code)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                 RETURNING id, user_code, username, full_name, email, phone, role, warehouse_id, created_at`;
    const result = await query(sql, [username, password_hash, full_name, email, phone, address, gender, date_of_birth, role, warehouse_id, user_code]);
    return result.rows[0];
  },

  // Cập nhật thông tin (user tự cập nhật)
  update: async (id, fields) => {
    const allowed = ['full_name', 'email', 'phone', 'address', 'gender', 'date_of_birth'];
    const sets = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = $${idx}`);
        values.push(fields[key]);
        idx++;
      }
    }
    if (sets.length === 0) return null;

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx}
                 RETURNING id, user_code, username, full_name, email, phone, address, gender, role, warehouse_id`;
    const result = await query(sql, values);
    return result.rows[0] || null;
  },

  // Admin cập nhật (cho phép đổi role, warehouse_id)
  adminUpdate: async (id, fields) => {
    const allowed = ['full_name', 'email', 'phone', 'address', 'gender', 'date_of_birth', 'role', 'warehouse_id', 'user_code'];
    const sets = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = $${idx}`);
        values.push(fields[key]);
        idx++;
      }
    }
    if (sets.length === 0) return null;

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx}
                 RETURNING id, user_code, username, full_name, email, phone, address, gender, date_of_birth, role, warehouse_id, created_at, updated_at`;
    const result = await query(sql, values);
    return result.rows[0] || null;
  },

  // Đổi mật khẩu
  updatePassword: async (id, password_hash) => {
    const sql = `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`;
    await query(sql, [password_hash, id]);
  },

  // Xoá user
  deleteById: async (id) => {
    const sql = `DELETE FROM users WHERE id = $1 RETURNING id`;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  },

  // Lấy danh sách (admin) — có search, filter role
  findAll: async ({ role, search, page = 1, limit = 20 } = {}) => {
    let where = ['TRUE'];
    const values = [];
    let idx = 1;

    if (role) {
      where.push(`role = $${idx++}`);
      values.push(role);
    }
    if (search) {
      where.push(`(username ILIKE $${idx} OR full_name ILIKE $${idx} OR email ILIKE $${idx} OR phone ILIKE $${idx} OR user_code ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    const whereClause = where.join(' AND ');

    // Count
    const countResult = await query(`SELECT COUNT(*) FROM users WHERE ${whereClause}`, values);
    const total = parseInt(countResult.rows[0].count);

    // Data (không trả password_hash)
    let sql = `SELECT id, user_code, username, full_name, email, phone, address, gender, date_of_birth,
                      role, warehouse_id, created_at, updated_at
               FROM users WHERE ${whereClause}
               ORDER BY created_at DESC
               LIMIT $${idx} OFFSET $${idx + 1}`;
    values.push(limit, (page - 1) * limit);

    const result = await query(sql, values);
    return { data: result.rows, total };
  }
};

module.exports = User;
