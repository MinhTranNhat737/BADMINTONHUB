// ═══════════════════════════════════════════════════════════════
// Model: Inventory (inventory + inventory_transactions)
// ═══════════════════════════════════════════════════════════════
const { query, getClient } = require('../config/database');

const Inventory = {
  // Lấy tồn kho theo kho
  findByWarehouse: async (warehouseId) => {
    const sql = `SELECT i.*, p.brand, p.image AS product_image
                 FROM inventory i
                 LEFT JOIN products p ON p.id = i.product_id
                 WHERE i.warehouse_id = $1
                 ORDER BY i.category, i.name`;
    const result = await query(sql, [warehouseId]);
    return result.rows;
  },

  // Tồn kho tất cả (dùng view)
  findAll: async ({ warehouseId, category, search, lowStock } = {}) => {
    let where = ['TRUE'];
    const values = [];
    let idx = 1;

    if (warehouseId) { where.push(`i.warehouse_id = $${idx++}`); values.push(warehouseId); }
    if (category)    { where.push(`i.category = $${idx++}`); values.push(category); }
    if (search)      { where.push(`(i.name ILIKE $${idx} OR i.sku ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
    if (lowStock)    { where.push(`i.available < i.reorder_point`); }

    const sql = `SELECT i.*, w.name AS warehouse_name, w.is_hub, b.name AS branch_name, p.brand
                 FROM inventory i
                 JOIN warehouses w ON w.id = i.warehouse_id
                 LEFT JOIN branches b ON b.id = w.branch_id
                 LEFT JOIN products p ON p.id = i.product_id
                 WHERE ${where.join(' AND ')}
                 ORDER BY w.id, i.category, i.name`;
    const result = await query(sql, values);
    return result.rows;
  },

  // Tìm 1 SKU tại 1 kho
  findBySkuAndWarehouse: async (sku, warehouseId) => {
    const sql = `SELECT * FROM inventory WHERE sku = $1 AND warehouse_id = $2`;
    const result = await query(sql, [sku, warehouseId]);
    return result.rows[0] || null;
  },

  // Nhập kho
  importStock: async ({ sku, warehouseId, qty, cost, note, operator }) => {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const parsedQty = Number(qty);
      if (!Number.isFinite(parsedQty) || parsedQty < 0) {
        throw { statusCode: 400, message: 'Số lượng nhập kho phải >= 0' };
      }

      const parsedCost = Number(cost || 0);
      const finalCost = Number.isFinite(parsedCost) ? parsedCost : 0;

      const existing = await client.query(
        `SELECT id FROM inventory WHERE sku = $1 AND warehouse_id = $2`,
        [sku, warehouseId]
      );

      if (existing.rows.length === 0) {
        const productResult = await client.query(
          `SELECT id, name, category, price FROM products WHERE sku = $1`,
          [sku]
        );

        if (productResult.rows.length === 0) {
          throw { statusCode: 404, message: 'SKU chưa tồn tại trong danh mục sản phẩm' };
        }

        const product = productResult.rows[0];
        await client.query(
          `INSERT INTO inventory (sku, product_id, warehouse_id, name, category, on_hand, reserved, reorder_point, unit_cost)
           VALUES ($1, $2, $3, $4, $5, $6, 0, 0, $7)`,
          [sku, product.id, warehouseId, product.name, product.category, parsedQty, finalCost || product.price || 0]
        );
      } else if (parsedQty > 0) {
        // Cập nhật on_hand (trigger tự tính available)
        await client.query(
          `UPDATE inventory SET on_hand = on_hand + $1 WHERE sku = $2 AND warehouse_id = $3`,
          [parsedQty, sku, warehouseId]
        );
      }

      // Ghi log giao dịch
      if (parsedQty > 0) {
        await client.query(
          `INSERT INTO inventory_transactions (type, date, sku, warehouse_id, qty, cost, note, operator)
           VALUES ('import', NOW(), $1, $2, $3, $4, $5, $6)`,
          [sku, warehouseId, parsedQty, finalCost, note, operator]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // Xuất kho
  exportStock: async ({ sku, warehouseId, qty, cost, note, operator }) => {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Kiểm tra tồn kho
      const inv = await client.query(
        `SELECT available FROM inventory WHERE sku = $1 AND warehouse_id = $2`, [sku, warehouseId]
      );
      if (!inv.rows[0] || inv.rows[0].available < qty) {
        throw { statusCode: 400, message: `Không đủ hàng. Khả dụng: ${inv.rows[0]?.available || 0}` };
      }

      await client.query(
        `UPDATE inventory SET on_hand = on_hand - $1 WHERE sku = $2 AND warehouse_id = $3`,
        [qty, sku, warehouseId]
      );

      await client.query(
        `INSERT INTO inventory_transactions (type, date, sku, warehouse_id, qty, cost, note, operator)
         VALUES ('export', NOW(), $1, $2, $3, $4, $5, $6)`,
        [sku, warehouseId, qty, cost, note, operator]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // Lấy lịch sử giao dịch
  getTransactions: async ({ warehouseId, sku, type, page = 1, limit = 50 } = {}) => {
    let where = ['TRUE'];
    const values = [];
    let idx = 1;

    if (warehouseId) { where.push(`t.warehouse_id = $${idx++}`); values.push(warehouseId); }
    if (sku)         { where.push(`t.sku = $${idx++}`); values.push(sku); }
    if (type)        { where.push(`t.type = $${idx++}`); values.push(type); }

    const sql = `SELECT t.*, w.name AS warehouse_name
                 FROM inventory_transactions t
                 JOIN warehouses w ON w.id = t.warehouse_id
                 WHERE ${where.join(' AND ')}
                 ORDER BY t.date DESC
                 LIMIT $${idx} OFFSET $${idx + 1}`;
    values.push(limit, (page - 1) * limit);

    const result = await query(sql, values);
    return result.rows;
  },

  // Cảnh báo sắp hết hàng
  getLowStock: async () => {
    const sql = `SELECT * FROM v_low_stock_alert`;
    const result = await query(sql);
    return result.rows;
  }
};

module.exports = Inventory;
