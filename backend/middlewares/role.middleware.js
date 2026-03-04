// ═══════════════════════════════════════════════════════════════
// Middleware phân quyền theo vai trò
// Sử dụng: authorize('admin', 'employee')
// ═══════════════════════════════════════════════════════════════

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Bạn không có quyền truy cập. Yêu cầu: ${roles.join(' hoặc ')}`
      });
    }

    next();
  };
};

module.exports = { authorize };
