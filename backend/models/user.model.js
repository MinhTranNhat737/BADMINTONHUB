// ═══════════════════════════════════════════════════════════════
// Model: Users (users)
// ═══════════════════════════════════════════════════════════════
const { query } = require('../config/database');

const User = {
  // Tìm theo ID
  findById: async (id) => {
    const sql = `SELECT id, username, full_name, email, phone, address, gender, 
                        date_of_birth, role, warehouse_id, created_at
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

  // Tạo user mới (đăng ký)
  create: async ({ username, password_hash, full_name, email, phone, address, gender, date_of_birth, role = 'user', warehouse_id = null }) => {
    const sql = `INSERT INTO users (username, password_hash, full_name, email, phone, address, gender, date_of_birth, role, warehouse_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING id, username, full_name, email, phone, role, warehouse_id, created_at`;
    const result = await query(sql, [username, password_hash, full_name, email, phone, address, gender, date_of_birth, role, warehouse_id]);
    return result.rows[0];
  },

  // Cập nhật thông tin
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
                 RETURNING id, username, full_name, email, phone, address, gender, role, warehouse_id`;
    const result = await query(sql, values);
    return result.rows[0] || null;
  },

  // Đổi mật khẩu
  updatePassword: async (id, password_hash) => {
    const sql = `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`;
    await query(sql, [password_hash, id]);
  },

  // Lấy danh sách (admin)
  findAll: async ({ role, page = 1, limit = 20 }) => {
    let sql = `SELECT id, username, full_name, email, phone, role, warehouse_id, created_at FROM users`;
    const values = [];
    if (role) {
      sql += ` WHERE role = $1`;
      values.push(role);
    }
    sql += ` ORDER BY created_at DESC`;

    // Count
    const countSql = sql.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) FROM').split('ORDER BY')[0];
    const countResult = await query(countSql, values);
    const total = parseInt(countResult.rows[0].count);

    // Paginate
    sql += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, (page - 1) * limit);

    const result = await query(sql, values);
    return { data: result.rows, total };
  }
};

module.exports = User;
