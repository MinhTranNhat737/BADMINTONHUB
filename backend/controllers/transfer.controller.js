// ═══════════════════════════════════════════════════════════════
// Controller: Transfers (điều chuyển kho)
// ═══════════════════════════════════════════════════════════════
const Transfer = require('../models/transfer.model');
const { success, created } = require('../utils/response');

// GET /api/transfers
const getAll = async (req, res, next) => {
  try {
    const { status, fromWarehouse, toWarehouse } = req.query;
    const transfers = await Transfer.findAll({
      status,
      fromWarehouse: fromWarehouse ? parseInt(fromWarehouse) : undefined,
      toWarehouse: toWarehouse ? parseInt(toWarehouse) : undefined
    });
    return success(res, transfers);
  } catch (err) { next(err); }
};

// GET /api/transfers/:id
const getById = async (req, res, next) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });
    return success(res, transfer);
  } catch (err) { next(err); }
};

// POST /api/transfers
const create = async (req, res, next) => {
  try {
    const data = { ...req.body, created_by: req.user.id };
    const transfer = await Transfer.create(data);
    return created(res, transfer, 'Tạo yêu cầu điều chuyển thành công');
  } catch (err) { next(err); }
};

// PATCH /api/transfers/:id/status
const updateStatus = async (req, res, next) => {
  try {
    const { status, exportedQtys } = req.body;
    const transfer = await Transfer.updateStatus(req.params.id, status, req.user.id, exportedQtys);
    if (!transfer) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });
    return success(res, transfer, 'Cập nhật trạng thái thành công');
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, updateStatus };
