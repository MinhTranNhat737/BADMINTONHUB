// ═══════════════════════════════════════════════════════════════
// Routes: Sales Orders (đơn bán tại quầy)
// ═══════════════════════════════════════════════════════════════
const router = require('express').Router();
const ctrl   = require('../controllers/sales-order.controller');
const { authenticate }  = require('../middlewares/auth.middleware');
const { authorize }     = require('../middlewares/role.middleware');

router.get('/',               authenticate, authorize('admin', 'employee'), ctrl.getAll);
router.get('/:id',            authenticate, authorize('admin', 'employee'), ctrl.getById);
router.post('/',              authenticate, authorize('admin', 'employee'), ctrl.create);
router.patch('/:id/approve',  authenticate, authorize('admin'), ctrl.approve);
router.patch('/:id/reject',   authenticate, authorize('admin'), ctrl.reject);

module.exports = router;
