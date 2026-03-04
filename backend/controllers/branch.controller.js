// ═══════════════════════════════════════════════════════════════
// Controller: Branches
// ═══════════════════════════════════════════════════════════════
const Branch = require('../models/branch.model');
const { success, created } = require('../utils/response');

// GET /api/branches
const getAll = async (req, res, next) => {
  try {
    const branches = await Branch.findAll();
    return success(res, branches);
  } catch (err) { next(err); }
};

// GET /api/branches/:id
const getById = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ success: false, message: 'Không tìm thấy chi nhánh' });
    return success(res, branch);
  } catch (err) { next(err); }
};

// POST /api/branches (admin)
const create = async (req, res, next) => {
  try {
    const branch = await Branch.create(req.body);
    return created(res, branch, 'Tạo chi nhánh thành công');
  } catch (err) { next(err); }
};

// PUT /api/branches/:id (admin)
const update = async (req, res, next) => {
  try {
    const branch = await Branch.update(req.params.id, req.body);
    if (!branch) return res.status(404).json({ success: false, message: 'Không tìm thấy chi nhánh' });
    return success(res, branch, 'Cập nhật thành công');
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update };
