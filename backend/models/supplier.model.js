// ═══════════════════════════════════════════════════════════════
// Model: Suppliers (suppliers)
// ═══════════════════════════════════════════════════════════════
const { query } = require('../config/database');

const Supplier = {
  findAll: async () => {
    const sql = `SELECT * FROM suppliers WHERE is_active = TRUE ORDER BY id`;
    const result = await query(sql);
    return result.rows;
  },

  findById: async (id) => {
    const sql = `SELECT * FROM suppliers WHERE id = $1`;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  },

  create: async ({ name, contact_person, phone, email, address }) => {
    const sql = `INSERT INTO suppliers (name, contact_person, phone, email, address)
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const result = await query(sql, [name, contact_person, phone, email, address]);
    return result.rows[0];
  },

  update: async (id, { name, contact_person, phone, email, address }) => {
    const sql = `UPDATE suppliers SET name = COALESCE($1, name), contact_person = COALESCE($2, contact_person),
                 phone = COALESCE($3, phone), email = COALESCE($4, email), address = COALESCE($5, address)
                 WHERE id = $6 RETURNING *`;
    const result = await query(sql, [name, contact_person, phone, email, address, id]);
    return result.rows[0] || null;
  }
};

module.exports = Supplier;
