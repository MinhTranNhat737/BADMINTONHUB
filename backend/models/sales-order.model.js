// ═══════════════════════════════════════════════════════════════
// Model: Sales Orders (sales_orders + sales_order_items)
// ═══════════════════════════════════════════════════════════════
const { query, getClient } = require('../config/database');

async function generateSalesCode(client) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateStr = `${yy}${mm}${dd}`;
  const pattern = `HD-${dateStr}-%`;

  const result = await client.query(
    `SELECT sales_code FROM sales_orders WHERE sales_code LIKE $1 ORDER BY sales_code DESC LIMIT 1`,
    [pattern]
  );

  let seq = 1;
  if (result.rows.length > 0 && result.rows[0].sales_code) {
    const lastSeq = parseInt(String(result.rows[0].sales_code).split('-').pop(), 10);
    if (!Number.isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `HD-${dateStr}-${String(seq).padStart(4, '0')}`;
}

const SalesOrder = {
  findAll: async ({ status, branchId, createdBy } = {}) => {
    let where = ['TRUE'];
    const values = [];
    let idx = 1;

    if (status)    { where.push(`so.status = $${idx++}`); values.push(status); }
    if (branchId)  { where.push(`so.branch_id = $${idx++}`); values.push(branchId); }
    if (createdBy) { where.push(`so.created_by = $${idx++}`); values.push(createdBy); }

    const sql = `SELECT so.*, u.full_name AS employee_name, br.name AS branch_name
                 FROM sales_orders so
                 JOIN users u ON u.id = so.created_by
                 LEFT JOIN branches br ON br.id = so.branch_id
                 WHERE ${where.join(' AND ')}
                 ORDER BY so.created_at DESC`;
    const result = await query(sql, values);

    for (const order of result.rows) {
      const items = await query(
        `SELECT soi.*, p.sku, p.category
         FROM sales_order_items soi
         LEFT JOIN products p ON p.id = soi.product_id
         WHERE soi.sales_order_id = $1`,
        [order.id]
      );
      order.items = items.rows;
    }

    return result.rows;
  },

  findById: async (id) => {
    const sql = `SELECT so.*, u.full_name AS employee_name, br.name AS branch_name
                 FROM sales_orders so
                 JOIN users u ON u.id = so.created_by
                 LEFT JOIN branches br ON br.id = so.branch_id
                 WHERE so.id = $1`;
    const result = await query(sql, [id]);
    if (result.rows.length === 0) return null;

    const order = result.rows[0];
    const items = await query(
      `SELECT soi.*, p.sku, p.category
       FROM sales_order_items soi
       LEFT JOIN products p ON p.id = soi.product_id
       WHERE soi.sales_order_id = $1`,
      [id]
    );
    order.items = items.rows;
    return order;
  },

  create: async (data) => {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const { created_by, branch_id, customer_name, customer_phone, total, discount = 0,
              final_total, payment_method, note, items } = data;

      const salesCode = await generateSalesCode(client);

      const sql = `INSERT INTO sales_orders (created_by, branch_id, customer_name, customer_phone,
                   total, discount, final_total, payment_method, note, sales_code)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`;
      const result = await client.query(sql, [created_by, branch_id, customer_name, customer_phone,
        total, discount, final_total, payment_method, note, salesCode]);
      const order = result.rows[0];

      for (const item of items) {
        await client.query(
          `INSERT INTO sales_order_items (sales_order_id, product_id, product_name, price, qty)
           VALUES ($1, $2, $3, $4, $5)`,
          [order.id, item.product_id, item.product_name, item.price, item.qty]
        );
      }

      await client.query('COMMIT');
      return order;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  updateStatus: async (id, { status, approved_by, reject_reason, payment_method, note }) => {
    let sql;
    if (status === 'approved') {
      sql = `UPDATE sales_orders
             SET status = 'approved',
                 approved_by = $1,
                 approved_at = NOW(),
                 payment_method = COALESCE($3, payment_method),
                 note = COALESCE($4, note)
             WHERE id = $2 RETURNING *`;
      const result = await query(sql, [approved_by, id, payment_method || null, note || null]);
      return result.rows[0] || null;
    } else if (status === 'rejected') {
      sql = `UPDATE sales_orders SET status = 'rejected', approved_by = $1, reject_reason = $2
             WHERE id = $3 RETURNING *`;
      const result = await query(sql, [approved_by, reject_reason, id]);
      return result.rows[0] || null;
    } else {
      sql = `UPDATE sales_orders SET status = $1 WHERE id = $2 RETURNING *`;
      const result = await query(sql, [status, id]);
      return result.rows[0] || null;
    }
  }
};

module.exports = SalesOrder;
