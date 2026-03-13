// ═══════════════════════════════════════════════════════════════
// Model: Transfer Requests (transfer_requests + transfer_items)
// ═══════════════════════════════════════════════════════════════
const { query, getClient } = require('../config/database');
const { generateCode } = require('../utils/code-generator');

const Transfer = {
  findAll: async ({ status, fromWarehouse, toWarehouse } = {}) => {
    let where = ['TRUE'];
    const values = [];
    let idx = 1;

    if (status) { where.push(`tr.status = $${idx++}`); values.push(status); }
    if (fromWarehouse) { where.push(`tr.from_warehouse_id = $${idx++}`); values.push(fromWarehouse); }
    if (toWarehouse) { where.push(`tr.to_warehouse_id = $${idx++}`); values.push(toWarehouse); }

    const sql = `SELECT tr.*, wf.name AS from_warehouse_name, wt.name AS to_warehouse_name,
                        u.full_name AS created_by_name
                 FROM transfer_requests tr
                 JOIN warehouses wf ON wf.id = tr.from_warehouse_id
                 JOIN warehouses wt ON wt.id = tr.to_warehouse_id
                 JOIN users u ON u.id = tr.created_by
                 WHERE ${where.join(' AND ')}
                 ORDER BY tr.created_at DESC`;
    const result = await query(sql, values);

    // Gắn items cho mỗi transfer
    for (const transfer of result.rows) {
      const items = await query('SELECT * FROM transfer_items WHERE transfer_id = $1', [transfer.id]);
      transfer.items = items.rows;
    }

    return result.rows;
  },

  findById: async (id) => {
    const sql = `SELECT tr.*, wf.name AS from_warehouse_name, wt.name AS to_warehouse_name
                 FROM transfer_requests tr
                 JOIN warehouses wf ON wf.id = tr.from_warehouse_id
                 JOIN warehouses wt ON wt.id = tr.to_warehouse_id
                 WHERE tr.id = $1`;
    const result = await query(sql, [id]);
    if (result.rows.length === 0) return null;

    const transfer = result.rows[0];
    const items = await query('SELECT * FROM transfer_items WHERE transfer_id = $1', [id]);
    transfer.items = items.rows;
    return transfer;
  },

  create: async (data) => {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const { from_warehouse_id, to_warehouse_id, reason, note, pickup_method,
        created_by, customer_name, customer_phone, items } = data;

      const transfer_code = await generateCode(client, 'DC', 'transfer_requests', 'transfer_code');

      const sql = `INSERT INTO transfer_requests (date, from_warehouse_id, to_warehouse_id, reason, note,
                   pickup_method, created_by, customer_name, customer_phone, transfer_code)
                   VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`;
      const result = await client.query(sql, [from_warehouse_id, to_warehouse_id, reason, note,
        pickup_method, created_by, customer_name, customer_phone, transfer_code]);

      const transfer = result.rows[0];

      for (const item of items) {
        await client.query(
          `INSERT INTO transfer_items (transfer_id, sku, name, qty, available_at_request)
           VALUES ($1, $2, $3, $4, $5)`,
          [transfer.id, item.sku, item.name, item.qty, item.available_at_request]
        );
      }

      await client.query('COMMIT');
      return transfer;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  updateStatus: async (id, status, userId, exportedQtys) => {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const normalizedStatus = status === 'in-transit' ? 'in_transit' : status;

      let sql;
      if (normalizedStatus === 'approved') {
        sql = `UPDATE transfer_requests SET status = $1, approved_by = $2, approved_at = NOW() WHERE id = $3 RETURNING *`;
      } else if (normalizedStatus === 'completed') {
        sql = `UPDATE transfer_requests SET status = $1, approved_by = COALESCE(approved_by, $2), completed_at = NOW() WHERE id = $3 RETURNING *`;
      } else if (normalizedStatus === 'in_transit') {
        sql = `UPDATE transfer_requests SET status = $1, approved_by = $2, approved_at = NOW() WHERE id = $3 RETURNING *`;
      } else {
        sql = `UPDATE transfer_requests SET status = $1 WHERE id = $3 RETURNING *`;
      }
      const result = await client.query(sql, [normalizedStatus, userId, id]);

      // When exporting (in-transit), update transfer_items with actual exported quantities
      if (normalizedStatus === 'in_transit' && exportedQtys && typeof exportedQtys === 'object') {
        for (const [sku, qty] of Object.entries(exportedQtys)) {
          await client.query(
            `UPDATE transfer_items SET qty = $1 WHERE transfer_id = $2 AND sku = $3`,
            [qty, id, sku]
          );
        }
      }

      await client.query('COMMIT');
      return result.rows[0] || null;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
};

module.exports = Transfer;
