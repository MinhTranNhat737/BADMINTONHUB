// ═══════════════════════════════════════════════════════════════
// Model: Purchase Orders (purchase_orders + po_items)
// ═══════════════════════════════════════════════════════════════
const { query, getClient } = require('../config/database');

function formatPOCode(id) {
  const normalized = String(id || '').replace(/-/g, '').toUpperCase();
  if (!normalized) return 'PO00000000';
  return `PO${normalized.slice(0, 8)}`;
}

async function resolveItemName(client, sku, fallbackName) {
  if (fallbackName) return fallbackName;

  const productResult = await client.query(
    'SELECT name FROM products WHERE sku = $1 LIMIT 1',
    [sku]
  );
  if (productResult.rows[0]?.name) return productResult.rows[0].name;

  const inventoryResult = await client.query(
    'SELECT name FROM inventory WHERE sku = $1 LIMIT 1',
    [sku]
  );
  if (inventoryResult.rows[0]?.name) return inventoryResult.rows[0].name;

  return sku;
}

const PurchaseOrder = {
  findAll: async ({ status, supplierId } = {}) => {
    let where = ['TRUE'];
    const values = [];
    let idx = 1;

    if (status)     { where.push(`po.status = $${idx++}`); values.push(status); }
    if (supplierId) { where.push(`po.supplier_id = $${idx++}`); values.push(supplierId); }

    const sql = `SELECT po.*, s.name AS supplier_name, w.name AS warehouse_name,
                        u.full_name AS created_by_name,
                        COALESCE(
                          json_agg(
                            json_build_object(
                              'sku', poi.sku,
                              'name', poi.name,
                              'qty', poi.qty,
                              'unitCost', poi.unit_cost
                            ) ORDER BY poi.id
                          ) FILTER (WHERE poi.id IS NOT NULL),
                          '[]'
                        ) AS po_items
                 FROM purchase_orders po
                 JOIN suppliers s ON s.id = po.supplier_id
                 JOIN warehouses w ON w.id = po.warehouse_id
                 JOIN users u ON u.id = po.created_by
                 LEFT JOIN po_items poi ON poi.po_id = po.id
                 WHERE ${where.join(' AND ')}
                 GROUP BY po.id, s.name, w.name, u.full_name
                 ORDER BY po.created_at DESC`;
    const result = await query(sql, values);
    return result.rows.map((row) => ({
      ...row,
      po_code: formatPOCode(row.id),
    }));
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
    po.po_code = formatPOCode(po.id);
    const items = await query('SELECT * FROM po_items WHERE po_id = $1', [id]);
    po.items = items.rows;
    return po;
  },

  create: async (data) => {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const { supplier_id, warehouse_id, total_value, note, created_by, items } = data;
      const normalizedItems = [];

      for (const item of items || []) {
        const qty = Number(item.qty ?? item.quantity ?? 0);
        const unitCost = Number(item.unit_cost ?? item.unitCost ?? item.price ?? 0);

        if (!item.sku || qty <= 0 || unitCost < 0) {
          throw new Error('Dữ liệu PO item không hợp lệ');
        }

        normalizedItems.push({
          sku: item.sku,
          qty,
          unit_cost: unitCost,
          name: await resolveItemName(client, item.sku, item.name),
        });
      }

      if (normalizedItems.length === 0) {
        throw new Error('Đơn đặt hàng phải có ít nhất 1 sản phẩm');
      }

      const resolvedTotalValue = total_value ?? normalizedItems.reduce((sum, item) => sum + item.qty * item.unit_cost, 0);

      const sql = `INSERT INTO purchase_orders (supplier_id, warehouse_id, total_value, note, created_by)
                   VALUES ($1, $2, $3, $4, $5) RETURNING *`;
      const result = await client.query(sql, [supplier_id, warehouse_id, resolvedTotalValue, note, created_by]);
      const po = result.rows[0];
      po.po_code = formatPOCode(po.id);

      for (const item of normalizedItems) {
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
    const po = result.rows[0] || null;
    if (!po) return null;
    po.po_code = formatPOCode(po.id);
    return po;
  }
};

module.exports = PurchaseOrder;
