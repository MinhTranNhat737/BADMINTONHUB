// ═══════════════════════════════════════════════════════════════
// Controller: Purchase Orders (đặt hàng NCC)
// ═══════════════════════════════════════════════════════════════
const PurchaseOrder = require('../models/purchase-order.model');
const Supplier      = require('../models/supplier.model');
const { success, created } = require('../utils/response');

// GET /api/purchase-orders
const getAll = async (req, res, next) => {
  try {
    const { status, supplierId } = req.query;
    const pos = await PurchaseOrder.findAll({
      status,
      supplierId: supplierId ? parseInt(supplierId) : undefined
    });
    return success(res, pos);
  } catch (err) { next(err); }
};

// GET /api/purchase-orders/:id
const getById = async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ success: false, message: 'Không tìm thấy PO' });
    return success(res, po);
  } catch (err) { next(err); }
};

// POST /api/purchase-orders
const create = async (req, res, next) => {
  try {
    const data = { ...req.body, created_by: req.user.id };
    const po = await PurchaseOrder.create(data);
    return created(res, po, 'Tạo đơn đặt hàng NCC thành công');
  } catch (err) { next(err); }
};

// PATCH /api/purchase-orders/:id/status
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const po = await PurchaseOrder.updateStatus(req.params.id, status);
    if (!po) return res.status(404).json({ success: false, message: 'Không tìm thấy PO' });
    return success(res, po, 'Cập nhật trạng thái thành công');
  } catch (err) { next(err); }
};

// GET /api/suppliers
const getSuppliers = async (req, res, next) => {
  try {
    const suppliers = await Supplier.findAll();
    return success(res, suppliers);
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, updateStatus, getSuppliers };
