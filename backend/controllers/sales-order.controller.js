// ═══════════════════════════════════════════════════════════════
// Controller: Sales Orders (đơn bán tại quầy)
// ═══════════════════════════════════════════════════════════════
const SalesOrder = require('../models/sales-order.model');
const { success, created } = require('../utils/response');

// GET /api/sales-orders
const getAll = async (req, res, next) => {
  try {
    const { status, branchId } = req.query;
    // Nhân viên chỉ xem đơn của mình
    const createdBy = req.user.role === 'employee' ? req.user.id : undefined;
    const result = await SalesOrder.findAll({
      status,
      branchId: branchId ? parseInt(branchId) : undefined,
      createdBy
    });
    return success(res, result);
  } catch (err) { next(err); }
};

// GET /api/sales-orders/:id
const getById = async (req, res, next) => {
  try {
    const order = await SalesOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn bán' });
    return success(res, order);
  } catch (err) { next(err); }
};

// POST /api/sales-orders (employee)
const create = async (req, res, next) => {
  try {
    const data = { ...req.body, created_by: req.user.id };
    const order = await SalesOrder.create(data);
    return created(res, order, 'Tạo đơn bán thành công');
  } catch (err) { next(err); }
};

// PATCH /api/sales-orders/:id/approve (admin)
const approve = async (req, res, next) => {
  try {
    const order = await SalesOrder.updateStatus(req.params.id, {
      status: 'approved',
      approved_by: req.user.id
    });
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn bán' });
    return success(res, order, 'Duyệt đơn thành công');
  } catch (err) { next(err); }
};

// PATCH /api/sales-orders/:id/reject (admin)
const reject = async (req, res, next) => {
  try {
    const { reject_reason } = req.body;
    const order = await SalesOrder.updateStatus(req.params.id, {
      status: 'rejected',
      approved_by: req.user.id,
      reject_reason
    });
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn bán' });
    return success(res, order, 'Từ chối đơn thành công');
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, approve, reject };
