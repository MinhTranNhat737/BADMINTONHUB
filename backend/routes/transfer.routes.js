// ═══════════════════════════════════════════════════════════════
// Routes: Transfers (điều chuyển kho)
// ═══════════════════════════════════════════════════════════════
const router = require('express').Router();
const ctrl   = require('../controllers/transfer.controller');
const { authenticate }  = require('../middlewares/auth.middleware');
const { authorize }     = require('../middlewares/role.middleware');

const auth = [authenticate, authorize('admin', 'employee')];

router.get('/',              ...auth, ctrl.getAll);
router.get('/:id',           ...auth, ctrl.getById);
router.post('/',             ...auth, ctrl.create);
router.patch('/:id/status',  ...auth, ctrl.updateStatus);

module.exports = router;
