// ═══════════════════════════════════════════════════════════════
// Middleware xác thực JWT
// ═══════════════════════════════════════════════════════════════
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// Xác thực token — gắn req.user nếu hợp lệ
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Lấy user từ DB
    const result = await query(
      'SELECT id, username, full_name, email, phone, role, warehouse_id FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token đã hết hạn' });
    }
    return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
  }
};

// Optional auth — không bắt buộc đăng nhập, nhưng nếu có token thì parse
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await query(
        'SELECT id, username, full_name, email, phone, role, warehouse_id FROM users WHERE id = $1',
        [decoded.id]
      );
      if (result.rows.length > 0) {
        req.user = result.rows[0];
      }
    }
  } catch (err) {
    // Bỏ qua lỗi token — tiếp tục như guest
  }
  next();
};

module.exports = { authenticate, optionalAuth };
