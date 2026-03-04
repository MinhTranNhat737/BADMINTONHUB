// ═══════════════════════════════════════════════════════════════
// Routes: Purchase Orders
// ═══════════════════════════════════════════════════════════════
const router = require('express').Router();
const ctrl   = require('../controllers/purchase-order.controller');
const { authenticate }  = require('../middlewares/auth.middleware');
const { authorize }     = require('../middlewares/role.middleware');

const adminOnly = [authenticate, authorize('admin')];

router.get('/',              ...adminOnly, ctrl.getAll);
router.get('/suppliers',     ...adminOnly, ctrl.getSuppliers);
router.get('/:id',           ...adminOnly, ctrl.getById);
router.post('/',             ...adminOnly, ctrl.create);
router.patch('/:id/status',  ...adminOnly, ctrl.updateStatus);

module.exports = router;
