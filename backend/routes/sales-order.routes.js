// ═══════════════════════════════════════════════════════════════
// Routes: Sales Orders (đơn bán tại quầy)
// ═══════════════════════════════════════════════════════════════
const router = require('express').Router();
const ctrl   = require('../controllers/sales-order.controller');
const { authenticate }  = require('../middlewares/auth.middleware');
const { authorize }     = require('../middlewares/role.middleware');

router.get('/',               authenticate, authorize('admin', 'employee'), ctrl.getAll);
router.get('/customers',      authenticate, authorize('admin', 'employee'), ctrl.searchCustomers);
router.post('/customers/walk-in-account', authenticate, authorize('admin', 'employee'), ctrl.createWalkInAccount);
router.get('/:id',            authenticate, authorize('admin', 'employee'), ctrl.getById);
router.post('/',              authenticate, authorize('admin', 'employee'), ctrl.create);
router.patch('/:id/approve',  authenticate, authorize('admin', 'employee'), ctrl.approve);
router.patch('/:id/reject',   authenticate, authorize('admin', 'employee'), ctrl.reject);
router.patch('/:id/complete', authenticate, authorize('admin', 'employee'), ctrl.complete);

module.exports = router;
