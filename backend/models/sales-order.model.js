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

async function syncTransferReadyOrders() {
  await query(
    `UPDATE sales_orders so
     SET status = 'waiting_payment'
     WHERE so.status = 'waiting_transfer'
       AND so.transfer_request_id IS NOT NULL
       AND EXISTS (
         SELECT 1
         FROM transfer_requests tr
         WHERE tr.id = so.transfer_request_id
           AND tr.status = 'completed'
       )`
  );
}

async function buildTransferForOrder(client, order, approvedBy) {
  if (!order.transfer_source_warehouse_id || !order.fulfill_warehouse_id) {
    throw { statusCode: 400, message: 'Thiếu kho nguồn hoặc kho đích để điều chuyển' };
  }

  if (Number(order.transfer_source_warehouse_id) === Number(order.fulfill_warehouse_id)) {
    throw { statusCode: 400, message: 'Kho nguồn điều chuyển phải khác kho đích' };
  }

  const itemsResult = await client.query(
    `SELECT soi.product_name, soi.qty, p.sku
     FROM sales_order_items soi
     LEFT JOIN products p ON p.id = soi.product_id
     WHERE soi.sales_order_id = $1`,
    [order.id]
  );

  if (itemsResult.rows.length === 0) {
    throw { statusCode: 400, message: 'Đơn bán chưa có sản phẩm để tạo điều chuyển' };
  }

  const normalizedItems = itemsResult.rows.map((item) => {
    const sku = String(item.sku || '').trim();
    const qty = Number(item.qty || 0);
    if (!sku || qty <= 0) {
      throw { statusCode: 400, message: 'Sản phẩm trong đơn thiếu SKU hoặc số lượng không hợp lệ cho điều chuyển' };
    }
    return {
      sku,
      name: item.product_name || sku,
      qty,
    };
  });

  const transferResult = await client.query(
    `INSERT INTO transfer_requests (
       date, from_warehouse_id, to_warehouse_id, reason, note,
       pickup_method, created_by, customer_name, customer_phone
     )
     VALUES (NOW(), $1, $2, $3, $4, 'delivery', $5, $6, $7)
     RETURNING *`,
    [
      order.transfer_source_warehouse_id,
      order.fulfill_warehouse_id,
      `Bổ sung hàng cho đơn ${order.sales_code || order.id}`,
      `DCDH ${order.sales_code || order.id}`,
      approvedBy || order.created_by,
      order.customer_name,
      order.customer_phone || null,
    ]
  );

  const transfer = transferResult.rows[0];

  for (const item of normalizedItems) {
    const invResult = await client.query(
      `SELECT available
       FROM inventory
       WHERE sku = $1 AND warehouse_id = $2
       LIMIT 1`,
      [item.sku, order.transfer_source_warehouse_id]
    );

    const available = Number(invResult.rows[0]?.available || 0);
    await client.query(
      `INSERT INTO transfer_items (transfer_id, sku, name, qty, available_at_request)
       VALUES ($1, $2, $3, $4, $5)`,
      [transfer.id, item.sku, item.name, item.qty, available]
    );
  }

  return transfer.id;
}

const SalesOrder = {
  findAll: async ({ status, branchId, createdBy } = {}) => {
    await syncTransferReadyOrders();

    let where = ['TRUE'];
    const values = [];
    let idx = 1;

    if (status)    { where.push(`so.status = $${idx++}`); values.push(status); }
    if (branchId)  { where.push(`so.branch_id = $${idx++}`); values.push(branchId); }
    if (createdBy) { where.push(`so.created_by = $${idx++}`); values.push(createdBy); }

    const sql = `SELECT so.*, u.full_name AS employee_name, br.name AS branch_name,
              wf.name AS fulfill_warehouse_name,
              ws.name AS transfer_source_warehouse_name,
              tr.status AS transfer_status
                 FROM sales_orders so
                 JOIN users u ON u.id = so.created_by
                 LEFT JOIN branches br ON br.id = so.branch_id
           LEFT JOIN warehouses wf ON wf.id = so.fulfill_warehouse_id
           LEFT JOIN warehouses ws ON ws.id = so.transfer_source_warehouse_id
           LEFT JOIN transfer_requests tr ON tr.id = so.transfer_request_id
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
    await syncTransferReadyOrders();

    const sql = `SELECT so.*, u.full_name AS employee_name, br.name AS branch_name,
                        wf.name AS fulfill_warehouse_name,
                        ws.name AS transfer_source_warehouse_name,
                        tr.status AS transfer_status
                 FROM sales_orders so
                 JOIN users u ON u.id = so.created_by
                 LEFT JOIN branches br ON br.id = so.branch_id
                 LEFT JOIN warehouses wf ON wf.id = so.fulfill_warehouse_id
                 LEFT JOIN warehouses ws ON ws.id = so.transfer_source_warehouse_id
                 LEFT JOIN transfer_requests tr ON tr.id = so.transfer_request_id
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
              final_total, payment_method, note, items,
              order_type = 'pay_at_shop',
              fulfillment_mode = 'shop_direct',
              fulfill_warehouse_id = null,
              transfer_source_warehouse_id = null,
              expected_pickup_date = null,
              payment_status = 'unpaid' } = data;

      if (!Array.isArray(items) || items.length === 0) {
        throw { statusCode: 400, message: 'Đơn bán phải có ít nhất 1 sản phẩm' };
      }

      const salesCode = await generateSalesCode(client);
      const normalizedPaymentMethod = payment_method || (order_type === 'delivery_cod' ? 'COD' : 'Tiền mặt');

      const sql = `INSERT INTO sales_orders (created_by, branch_id, customer_name, customer_phone,
                   total, discount, final_total, payment_method, note, sales_code,
                   order_type, fulfillment_mode, fulfill_warehouse_id, transfer_source_warehouse_id,
                   expected_pickup_date, payment_status)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`;
      const result = await client.query(sql, [created_by, branch_id, customer_name, customer_phone,
        total, discount, final_total, normalizedPaymentMethod, note, salesCode,
        order_type, fulfillment_mode, fulfill_warehouse_id, transfer_source_warehouse_id,
        expected_pickup_date, payment_status]);
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

  approve: async (id, { approved_by, payment_method, note }) => {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const currentResult = await client.query(
        `SELECT * FROM sales_orders WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (currentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const order = currentResult.rows[0];
      if (order.status === 'rejected' || order.status === 'exported') {
        throw { statusCode: 400, message: 'Đơn bán đã kết thúc, không thể duyệt lại' };
      }

      let nextStatus = 'approved';
      let transferRequestId = order.transfer_request_id;

      if (order.order_type === 'pay_at_shop') {
        if (order.fulfillment_mode === 'shop_transfer') {
          if (!transferRequestId) {
            transferRequestId = await buildTransferForOrder(client, order, approved_by);
          }
          nextStatus = 'waiting_transfer';
        } else {
          nextStatus = 'waiting_payment';
        }
      }

      const result = await client.query(
        `UPDATE sales_orders
         SET status = $1,
             approved_by = $2,
             approved_at = COALESCE(approved_at, NOW()),
             payment_method = COALESCE($3, payment_method),
             note = COALESCE($4, note),
             transfer_request_id = COALESCE($5, transfer_request_id)
         WHERE id = $6
         RETURNING *`,
        [
          nextStatus,
          approved_by,
          payment_method || null,
          note || null,
          transferRequestId || null,
          id,
        ]
      );

      await client.query('COMMIT');
      return result.rows[0] || null;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  reject: async (id, { approved_by, reject_reason }) => {
    const sql = `UPDATE sales_orders
                 SET status = 'rejected', approved_by = $1, reject_reason = $2
                 WHERE id = $3
                 RETURNING *`;
    const result = await query(sql, [approved_by, reject_reason, id]);
    return result.rows[0] || null;
  },

  confirmPayment: async (id, { confirmed_by, payment_method, note }) => {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const currentResult = await client.query(
        `SELECT * FROM sales_orders WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (currentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const order = currentResult.rows[0];
      if (order.status === 'rejected' || order.status === 'exported') {
        throw { statusCode: 400, message: 'Đơn bán đã kết thúc, không thể xác nhận thanh toán' };
      }

      const result = await client.query(
        `UPDATE sales_orders
         SET payment_status = 'paid',
             payment_confirmed_by = $1,
             payment_confirmed_at = NOW(),
             payment_method = COALESCE($2, payment_method),
             note = COALESCE($3, note),
             status = CASE WHEN status = 'waiting_payment' THEN 'approved' ELSE status END
         WHERE id = $4
         RETURNING *`,
        [confirmed_by, payment_method || null, note || null, id]
      );

      await client.query('COMMIT');
      return result.rows[0] || null;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  complete: async (id, { note } = {}) => {
    await syncTransferReadyOrders();

    const current = await query(`SELECT * FROM sales_orders WHERE id = $1`, [id]);
    if (current.rows.length === 0) return null;

    const order = current.rows[0];

    if (order.status !== 'approved') {
      throw { statusCode: 400, message: 'Đơn chưa sẵn sàng để hoàn thành xuất kho' };
    }

    if (order.order_type === 'pay_at_shop' && order.payment_status !== 'paid') {
      throw { statusCode: 400, message: 'Đơn thanh toán tại shop phải xác nhận thanh toán trước khi xuất kho' };
    }

    if (order.fulfillment_mode === 'shop_transfer') {
      if (!order.transfer_request_id) {
        throw { statusCode: 400, message: 'Thiếu phiếu điều chuyển cho đơn hẹn lấy tại shop' };
      }

      const transferResult = await query(
        `SELECT status FROM transfer_requests WHERE id = $1`,
        [order.transfer_request_id]
      );

      if (transferResult.rows.length === 0 || transferResult.rows[0].status !== 'completed') {
        throw { statusCode: 400, message: 'Kho đích chưa xác nhận nhập điều chuyển, chưa thể hoàn thành đơn' };
      }
    }

    const result = await query(
      `UPDATE sales_orders
       SET status = 'exported',
           note = COALESCE($1, note)
       WHERE id = $2
       RETURNING *`,
      [note || null, id]
    );
    return result.rows[0] || null;
  },
};

module.exports = SalesOrder;
