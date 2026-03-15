// ═══════════════════════════════════════════════════════════════
// Controller: Sales Orders (đơn bán tại quầy)
// ═══════════════════════════════════════════════════════════════
const SalesOrder = require('../models/sales-order.model');
const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { success, created } = require('../utils/response');

const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '');

const generateWalkInPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let index = 0; index < 8; index += 1) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const generateWalkInUsername = async (phone) => {
  const normalized = normalizePhone(phone);
  const base = `kh${normalized.slice(-6) || Date.now().toString().slice(-6)}`;
  let username = base;
  let seq = 1;

  while (await User.findByUsername(username)) {
    username = `${base}${seq}`;
    seq += 1;
  }
  return username;
};

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

// GET /api/sales-orders/customers?search=
const searchCustomers = async (req, res, next) => {
  try {
    const q = String(req.query.search || '').trim();
    if (!q) return success(res, []);

    const result = await query(
      `SELECT id, user_code, username, full_name, phone, email, role
       FROM users
       WHERE role IN ('user', 'guest')
         AND (full_name ILIKE $1 OR phone ILIKE $1 OR user_code ILIKE $1)
       ORDER BY updated_at DESC NULLS LAST, created_at DESC
       LIMIT 20`,
      [`%${q}%`]
    );

    return success(res, result.rows);
  } catch (err) { next(err); }
};

// POST /api/sales-orders/customers/walk-in-account
const createWalkInAccount = async (req, res, next) => {
  try {
    const { full_name, phone, create_account = true } = req.body || {};
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      return res.status(400).json({ success: false, message: 'Thiếu số điện thoại' });
    }

    const existingByPhone = await User.findByPhone(normalizedPhone);
    if (existingByPhone) {
      const existingUser = await User.findById(existingByPhone.id);
      return success(res, {
        user: existingUser,
        credentials: null,
        existed: true,
      }, 'Số điện thoại đã có tài khoản');
    }

    if (!create_account) {
      return success(res, {
        user: {
          id: null,
          full_name: full_name || `Khách vãng lai ${normalizedPhone.slice(-4)}`,
          phone: normalizedPhone,
          role: 'guest',
        },
        credentials: null,
        existed: false,
      });
    }

    const username = await generateWalkInUsername(normalizedPhone);
    const password = generateWalkInPassword();
    const password_hash = await bcrypt.hash(password, 10);
    const safeEmail = `walkin_${normalizedPhone}@badmintonhub.local`;

    const createdUser = await User.create({
      username,
      password_hash,
      full_name: full_name || `Khách vãng lai ${normalizedPhone.slice(-4)}`,
      email: safeEmail,
      phone: normalizedPhone,
      address: null,
      gender: null,
      date_of_birth: null,
      role: 'user',
      warehouse_id: null,
    });

    return created(res, {
      user: createdUser,
      credentials: { username, password },
      existed: false,
    }, 'Cấp tài khoản khách vãng lai thành công');
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
    const { payment_method, note } = req.body || {};
    const order = await SalesOrder.updateStatus(req.params.id, {
      status: 'approved',
      approved_by: req.user.id,
      payment_method,
      note
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

// PATCH /api/sales-orders/:id/complete
const complete = async (req, res, next) => {
  try {
    const order = await SalesOrder.updateStatus(req.params.id, { status: 'exported' });
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn bán' });
    return success(res, order, 'Hoàn thành đơn thành công');
  } catch (err) { next(err); }
};

module.exports = {
  getAll,
  getById,
  searchCustomers,
  createWalkInAccount,
  create,
  approve,
  reject,
  complete,
};
