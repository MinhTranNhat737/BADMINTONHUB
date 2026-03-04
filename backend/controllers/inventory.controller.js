// ═══════════════════════════════════════════════════════════════
// Controller: Inventory
// ═══════════════════════════════════════════════════════════════
const Inventory = require('../models/inventory.model');
const Warehouse = require('../models/warehouse.model');
const { success } = require('../utils/response');

// GET /api/inventory
const getAll = async (req, res, next) => {
  try {
    const { warehouseId, category, search, lowStock } = req.query;
    const items = await Inventory.findAll({
      warehouseId: warehouseId ? parseInt(warehouseId) : undefined,
      category, search,
      lowStock: lowStock === 'true'
    });
    return success(res, items);
  } catch (err) { next(err); }
};

// GET /api/inventory/warehouse/:warehouseId
const getByWarehouse = async (req, res, next) => {
  try {
    const items = await Inventory.findByWarehouse(parseInt(req.params.warehouseId));
    return success(res, items);
  } catch (err) { next(err); }
};

// GET /api/inventory/low-stock
const getLowStock = async (req, res, next) => {
  try {
    const items = await Inventory.getLowStock();
    return success(res, items);
  } catch (err) { next(err); }
};

// GET /api/inventory/transactions
const getTransactions = async (req, res, next) => {
  try {
    const { warehouseId, sku, type, page = 1, limit = 50 } = req.query;
    const transactions = await Inventory.getTransactions({
      warehouseId: warehouseId ? parseInt(warehouseId) : undefined,
      sku, type,
      page: parseInt(page), limit: parseInt(limit)
    });
    return success(res, transactions);
  } catch (err) { next(err); }
};

// POST /api/inventory/import (nhập kho)
const importStock = async (req, res, next) => {
  try {
    const { sku, warehouseId, qty, cost, note } = req.body;
    if (!sku || !warehouseId || !qty) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin: sku, warehouseId, qty' });
    }
    await Inventory.importStock({
      sku, warehouseId, qty, cost: cost || 0, note,
      operator: req.user.full_name
    });
    return success(res, null, 'Nhập kho thành công');
  } catch (err) { next(err); }
};

// POST /api/inventory/export (xuất kho)
const exportStock = async (req, res, next) => {
  try {
    const { sku, warehouseId, qty, cost, note } = req.body;
    if (!sku || !warehouseId || !qty) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin: sku, warehouseId, qty' });
    }
    await Inventory.exportStock({
      sku, warehouseId, qty, cost: cost || 0, note,
      operator: req.user.full_name
    });
    return success(res, null, 'Xuất kho thành công');
  } catch (err) { next(err); }
};

// GET /api/inventory/warehouses
const getWarehouses = async (req, res, next) => {
  try {
    const warehouses = await Warehouse.findAll();
    return success(res, warehouses);
  } catch (err) { next(err); }
};

module.exports = { getAll, getByWarehouse, getLowStock, getTransactions, importStock, exportStock, getWarehouses };
