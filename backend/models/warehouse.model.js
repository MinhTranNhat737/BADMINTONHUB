// ═══════════════════════════════════════════════════════════════
// Model: Warehouses (warehouses)
// ═══════════════════════════════════════════════════════════════
const { query } = require('../config/database');

const Warehouse = {
  findAll: async () => {
    const sql = `SELECT w.*, b.name AS branch_name 
                 FROM warehouses w 
                 LEFT JOIN branches b ON b.id = w.branch_id
                 WHERE w.is_active = TRUE ORDER BY w.id`;
    const result = await query(sql);
    return result.rows;
  },

  findById: async (id) => {
    const sql = `SELECT w.*, b.name AS branch_name 
                 FROM warehouses w 
                 LEFT JOIN branches b ON b.id = w.branch_id
                 WHERE w.id = $1`;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  },

  findHub: async () => {
    const sql = `SELECT * FROM warehouses WHERE is_hub = TRUE LIMIT 1`;
    const result = await query(sql);
    return result.rows[0] || null;
  },

  findByBranch: async (branchId) => {
    const sql = `SELECT * FROM warehouses WHERE branch_id = $1 AND is_active = TRUE`;
    const result = await query(sql, [branchId]);
    return result.rows[0] || null;
  }
};

module.exports = Warehouse;
