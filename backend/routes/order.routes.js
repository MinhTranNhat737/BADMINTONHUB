// ═══════════════════════════════════════════════════════════════
// Routes: Orders (đơn hàng online)
// ═══════════════════════════════════════════════════════════════
const router = require('express').Router();
const ctrl   = require('../controllers/order.controller');
const { authenticate, optionalAuth } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.get('/',             authenticate, authorize('admin', 'employee'), ctrl.getAll);       // Admin/NV
router.get('/my',           authenticate, ctrl.getMyOrders);                                  // User
router.get('/:id',          authenticate, ctrl.getById);                                      // Auth
router.post('/',            optionalAuth, ctrl.create);                                       // Khách + User
router.patch('/:id/status', authenticate, authorize('admin', 'employee'), ctrl.updateStatus); // Admin/NV

module.exports = router;
