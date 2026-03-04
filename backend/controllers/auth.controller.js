// ═══════════════════════════════════════════════════════════════
// Controller: Auth (Đăng ký, Đăng nhập, Profile)
// ═══════════════════════════════════════════════════════════════
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const User   = require('../models/user.model');
const { success, created } = require('../utils/response');

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { username, password, full_name, email, phone, address, gender, date_of_birth } = req.body;

    // Validate bắt buộc
    if (!username || !password || !full_name || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    }

    // Kiểm tra trùng
    const existUser = await User.findByUsername(username);
    if (existUser) return res.status(409).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });

    const existEmail = await User.findByEmail(email);
    if (existEmail) return res.status(409).json({ success: false, message: 'Email đã được sử dụng' });

    const existPhone = await User.findByPhone(phone);
    if (existPhone) return res.status(409).json({ success: false, message: 'Số điện thoại đã được sử dụng' });

    // Hash mật khẩu
    const password_hash = await bcrypt.hash(password, 10);

    // Tạo user
    const user = await User.create({
      username, password_hash, full_name, email, phone, address, gender, date_of_birth, role: 'user'
    });

    // Tạo token
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    return created(res, { user, token }, 'Đăng ký thành công');
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Nhập tên đăng nhập và mật khẩu' });
    }

    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu sai' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu sai' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    // Loại bỏ password_hash khỏi response
    const { password_hash, ...userWithoutPassword } = user;

    return success(res, { user: userWithoutPassword, token }, 'Đăng nhập thành công');
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy user' });
    return success(res, user);
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/me
const updateProfile = async (req, res, next) => {
  try {
    const updated = await User.update(req.user.id, req.body);
    if (!updated) return res.status(400).json({ success: false, message: 'Không có gì để cập nhật' });
    return success(res, updated, 'Cập nhật thành công');
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Nhập mật khẩu cũ và mới' });
    }

    const user = await User.findByUsername(req.user.username);
    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Mật khẩu cũ không đúng' });
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await User.updatePassword(req.user.id, password_hash);

    return success(res, null, 'Đổi mật khẩu thành công');
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getProfile, updateProfile, changePassword };
