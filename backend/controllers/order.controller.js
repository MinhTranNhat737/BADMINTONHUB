// ═══════════════════════════════════════════════════════════════
// Controller: Orders (đơn hàng online)
// ═══════════════════════════════════════════════════════════════
const Order = require('../models/order.model');
const { success, created, paginated } = require('../utils/response');

// GET /api/orders (admin)
const getAll = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const result = await Order.findAll({ status, page: parseInt(page), limit: parseInt(limit) });
    return paginated(res, { ...result, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

// GET /api/orders/my (user)
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.findByUser(req.user.id);
    return success(res, orders);
  } catch (err) { next(err); }
};

// GET /api/orders/:id
const getById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    return success(res, order);
  } catch (err) { next(err); }
};

// POST /api/orders
const create = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (req.user) data.user_id = req.user.id;
    const order = await Order.create(data);
    return created(res, order, 'Đặt hàng thành công');
  } catch (err) { next(err); }
};

// PATCH /api/orders/:id/status (admin)
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.updateStatus(req.params.id, status, req.user?.id);
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    return success(res, order, 'Cập nhật trạng thái thành công');
  } catch (err) { next(err); }
};

module.exports = { getAll, getMyOrders, getById, create, updateStatus };
