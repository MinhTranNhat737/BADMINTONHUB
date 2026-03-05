// ═══════════════════════════════════════════════════════════════
// Controller: User Management (Admin CRUD)
// ═══════════════════════════════════════════════════════════════
const bcrypt = require('bcryptjs');
const User   = require('../models/user.model');
const { success, paginated, created } = require('../utils/response');

// GET /api/users — Danh sách tài khoản (có filter, search, phân trang)
const getAll = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const result = await User.findAll({
      role: role || undefined,
      search: search || undefined,
      page: parseInt(page),
      limit: parseInt(limit),
    });
    return paginated(res, {
      data: result.data,
      total: result.total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) { next(err); }
};

// GET /api/users/:id — Chi tiết tài khoản
const getById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    return success(res, user);
  } catch (err) { next(err); }
};

// POST /api/users — Admin tạo tài khoản mới
const create = async (req, res, next) => {
  try {
    const { username, password, full_name, email, phone, address, gender, date_of_birth, role = 'user', warehouse_id } = req.body;

    // Validate
    if (!username || !password || !full_name || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc (username, password, full_name, email, phone)' });
    }
    if (!['admin', 'employee', 'user', 'guest'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role không hợp lệ' });
    }

    // Kiểm tra trùng
    const existUser = await User.findByUsername(username);
    if (existUser) return res.status(409).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });

    const existEmail = await User.findByEmail(email);
    if (existEmail) return res.status(409).json({ success: false, message: 'Email đã được sử dụng' });

    const existPhone = await User.findByPhone(phone);
    if (existPhone) return res.status(409).json({ success: false, message: 'Số điện thoại đã được sử dụng' });

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Tạo user (user_code sẽ tự sinh trong model)
    const user = await User.create({
      username, password_hash, full_name, email, phone,
      address: address || null,
      gender: gender || null,
      date_of_birth: date_of_birth || null,
      role,
      warehouse_id: warehouse_id || null,
    });

    return created(res, user, 'Tạo tài khoản thành công');
  } catch (err) { next(err); }
};

// PUT /api/users/:id — Admin cập nhật tài khoản
const update = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Nếu có đổi email/phone → kiểm tra trùng
    if (req.body.email) {
      const exist = await User.findByEmail(req.body.email);
      if (exist && exist.id !== id) {
        return res.status(409).json({ success: false, message: 'Email đã được sử dụng bởi tài khoản khác' });
      }
    }
    if (req.body.phone) {
      const exist = await User.findByPhone(req.body.phone);
      if (exist && exist.id !== id) {
        return res.status(409).json({ success: false, message: 'Số điện thoại đã được sử dụng bởi tài khoản khác' });
      }
    }

    const updated = await User.adminUpdate(id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản hoặc không có gì để cập nhật' });
    return success(res, updated, 'Cập nhật tài khoản thành công');
  } catch (err) { next(err); }
};

// PUT /api/users/:id/password — Admin đặt lại mật khẩu
const resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải ít nhất 6 ký tự' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });

    const password_hash = await bcrypt.hash(new_password, 10);
    await User.updatePassword(id, password_hash);

    return success(res, null, 'Đặt lại mật khẩu thành công');
  } catch (err) { next(err); }
};

// DELETE /api/users/:id — Xoá tài khoản
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Không cho phép xoá chính mình
    if (req.user.id === id) {
      return res.status(400).json({ success: false, message: 'Không thể xoá tài khoản của chính mình' });
    }

    const result = await User.deleteById(id);
    if (!result) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    return success(res, null, 'Xoá tài khoản thành công');
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, resetPassword, remove };
