// ═══════════════════════════════════════════════════════════════
// Model: Branches (branches)
// ═══════════════════════════════════════════════════════════════
const { query } = require('../config/database');

const Branch = {
  findAll: async () => {
    const sql = `SELECT * FROM branches WHERE is_active = TRUE ORDER BY id`;
    const result = await query(sql);
    return result.rows;
  },

  findById: async (id) => {
    const sql = `SELECT * FROM branches WHERE id = $1`;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  },

  create: async ({ name, address, lat, lng, phone, email }) => {
    const sql = `INSERT INTO branches (name, address, lat, lng, phone, email)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
    const result = await query(sql, [name, address, lat, lng, phone, email]);
    return result.rows[0];
  },

  update: async (id, { name, address, lat, lng, phone, email }) => {
    const sql = `UPDATE branches SET name = COALESCE($1, name), address = COALESCE($2, address),
                 lat = COALESCE($3, lat), lng = COALESCE($4, lng),
                 phone = COALESCE($5, phone), email = COALESCE($6, email)
                 WHERE id = $7 RETURNING *`;
    const result = await query(sql, [name, address, lat, lng, phone, email, id]);
    return result.rows[0] || null;
  }
};

module.exports = Branch;
