// ═══════════════════════════════════════════════════════════════
// Routes: User Management (Admin only)
// ═══════════════════════════════════════════════════════════════
const router = require('express').Router();
const ctrl   = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// Tất cả route yêu cầu đăng nhập + role admin
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Chỉ admin mới có quyền truy cập' });
  }
  next();
};

const adminOrEmployee = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'employee') {
    return res.status(403).json({ success: false, message: 'Chỉ admin hoặc nhân viên mới có quyền truy cập' });
  }
  next();
};

router.get('/lookup/phone',    authenticate, adminOrEmployee, ctrl.lookupByPhone);
router.get('/',                 authenticate, adminOnly, ctrl.getAll);
router.get('/:id',              authenticate, adminOnly, ctrl.getById);
router.post('/',                authenticate, adminOnly, ctrl.create);
router.put('/:id',              authenticate, adminOnly, ctrl.update);
router.put('/:id/password',     authenticate, adminOnly, ctrl.resetPassword);
router.delete('/:id',           authenticate, adminOnly, ctrl.remove);

module.exports = router;
