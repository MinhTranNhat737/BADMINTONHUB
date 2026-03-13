// ═══════════════════════════════════════════════════════════════
// Model: Orders (orders + order_items) — Đơn hàng online
// ═══════════════════════════════════════════════════════════════
const { query, getClient } = require('../config/database');
const { generateCode } = require('../utils/code-generator');

const Order = {
  // Lấy danh sách đơn (admin)
  findAll: async ({ status, userId, page = 1, limit = 20 } = {}) => {
    let where = ['TRUE'];
    const values = [];
    let idx = 1;

    if (status) { where.push(`o.status = $${idx++}`); values.push(status); }
    if (userId) { where.push(`o.user_id = $${idx++}`); values.push(userId); }

    const whereClause = where.join(' AND ');

    const countResult = await query(`SELECT COUNT(*) FROM orders o WHERE ${whereClause}`, values);
    const total = parseInt(countResult.rows[0].count);

    let sql = `SELECT o.*, pb.name AS pickup_branch_name
               FROM orders o
               LEFT JOIN branches pb ON pb.id = o.pickup_branch_id
               WHERE ${whereClause}
               ORDER BY o.created_at DESC`;
    sql += ` LIMIT $${idx} OFFSET $${idx + 1}`;
    values.push(limit, (page - 1) * limit);

    const result = await query(sql, values);

    // Gắn items cho mỗi đơn
    for (const order of result.rows) {
      const items = await query(
        `SELECT oi.*, p.sku, p.brand FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = $1`, [order.id]
      );
      order.items = items.rows;
    }

    return { data: result.rows, total };
  },

  // Lấy 1 đơn kèm items
  findById: async (id) => {
    const sql = `SELECT o.*, pb.name AS pickup_branch_name
                 FROM orders o
                 LEFT JOIN branches pb ON pb.id = o.pickup_branch_id
                 WHERE o.id = $1`;
    const result = await query(sql, [id]);
    if (result.rows.length === 0) return null;

    const order = result.rows[0];
    const items = await query(
      `SELECT oi.*, p.sku, p.brand FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1`, [id]
    );
    order.items = items.rows;
    return order;
  },

  // Đơn hàng của user
  findByUser: async (userId) => {
    const sql = `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`;
    const result = await query(sql, [userId]);

    for (const order of result.rows) {
      const items = await query(
        `SELECT oi.*, p.sku, p.brand FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = $1`, [order.id]
      );
      order.items = items.rows;
    }

    return result.rows;
  },

  // Tạo đơn (transaction)
  create: async (data) => {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const { user_id, type = 'online', delivery_method, pickup_branch_id, fulfilling_warehouse,
              customer_coords, customer_name, customer_phone, customer_email, customer_address,
              note, subtotal, shipping_fee, total, payment_method, items } = data;

      const order_code = await generateCode(client, 'DH', 'orders', 'order_code');

      const sql = `INSERT INTO orders (user_id, type, delivery_method, pickup_branch_id, fulfilling_warehouse,
                   customer_coords, customer_name, customer_phone, customer_email, customer_address,
                   note, subtotal, shipping_fee, total, payment_method, order_code)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`;
      const result = await client.query(sql, [user_id, type, delivery_method, pickup_branch_id,
        fulfilling_warehouse, customer_coords ? JSON.stringify(customer_coords) : null,
        customer_name, customer_phone, customer_email, customer_address,
        note, subtotal, shipping_fee || 0, total, payment_method, order_code]);

      const order = result.rows[0];

      // Thêm items
      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, price, qty)
           VALUES ($1, $2, $3, $4, $5)`,
          [order.id, item.product_id, item.product_name, item.price, item.qty || item.quantity]
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

  // Cập nhật trạng thái
  updateStatus: async (id, status, approved_by = null) => {
    const sql = `UPDATE orders SET status = $1, approved_by = COALESCE($2, approved_by), updated_at = NOW()
                 WHERE id = $3 RETURNING *`;
    const result = await query(sql, [status, approved_by, id]);
    return result.rows[0] || null;
  }
};

module.exports = Order;
