// ═══════════════════════════════════════════════════════════════
// Model: Purchase Orders (purchase_orders + po_items)
// ═══════════════════════════════════════════════════════════════
const { query, getClient } = require('../config/database');
const { generateCode } = require('../utils/code-generator');

const PurchaseOrder = {
  findAll: async ({ status, supplierId } = {}) => {
    let where = ['TRUE'];
    const values = [];
    let idx = 1;

    if (status) { where.push(`po.status = $${idx++}`); values.push(status); }
    if (supplierId) { where.push(`po.supplier_id = $${idx++}`); values.push(supplierId); }

    const sql = `SELECT po.*, s.name AS supplier_name, w.name AS warehouse_name,
                        u.full_name AS created_by_name
                 FROM purchase_orders po
                 JOIN suppliers s ON s.id = po.supplier_id
                 JOIN warehouses w ON w.id = po.warehouse_id
                 JOIN users u ON u.id = po.created_by
                 WHERE ${where.join(' AND ')}
                 ORDER BY po.created_at DESC`;
    const result = await query(sql, values);

    // Gắn items cho mỗi PO
    for (const po of result.rows) {
      const items = await query('SELECT * FROM po_items WHERE po_id = $1', [po.id]);
      po.po_items = items.rows;
    }

    return result.rows;
  },

  findById: async (id) => {
    const sql = `SELECT po.*, s.name AS supplier_name, w.name AS warehouse_name
                 FROM purchase_orders po
                 JOIN suppliers s ON s.id = po.supplier_id
                 JOIN warehouses w ON w.id = po.warehouse_id
                 WHERE po.id = $1`;
    const result = await query(sql, [id]);
    if (result.rows.length === 0) return null;

    const po = result.rows[0];
    const items = await query('SELECT * FROM po_items WHERE po_id = $1', [id]);
    po.items = items.rows;
    return po;
  },

  create: async (data) => {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const { supplier_id, warehouse_id, total_value, note, created_by, items } = data;

      const po_code = await generateCode(client, 'PO', 'purchase_orders', 'po_code');

      const sql = `INSERT INTO purchase_orders (supplier_id, warehouse_id, total_value, note, created_by, po_code)
                   VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
      const result = await client.query(sql, [supplier_id, warehouse_id, total_value, note, created_by, po_code]);
      const po = result.rows[0];

      for (const item of items) {
        await client.query(
          `INSERT INTO po_items (po_id, sku, name, qty, unit_cost) VALUES ($1, $2, $3, $4, $5)`,
          [po.id, item.sku, item.name, item.qty, item.unit_cost]
        );
      }

      await client.query('COMMIT');
      return po;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  updateStatus: async (id, status) => {
    const sql = `UPDATE purchase_orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`;
    const result = await query(sql, [status, id]);
    return result.rows[0] || null;
  }
};

module.exports = PurchaseOrder;
