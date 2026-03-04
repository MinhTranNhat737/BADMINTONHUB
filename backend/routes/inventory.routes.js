// ═══════════════════════════════════════════════════════════════
// Routes: Inventory
// ═══════════════════════════════════════════════════════════════
const router = require('express').Router();
const ctrl   = require('../controllers/inventory.controller');
const { authenticate }  = require('../middlewares/auth.middleware');
const { authorize }     = require('../middlewares/role.middleware');

const auth = [authenticate, authorize('admin', 'employee')];

router.get('/',                        ...auth, ctrl.getAll);           // Admin/NV
router.get('/warehouses',              ...auth, ctrl.getWarehouses);    // Admin/NV
router.get('/low-stock',               ...auth, ctrl.getLowStock);      // Admin/NV
router.get('/transactions',            ...auth, ctrl.getTransactions);  // Admin/NV
router.get('/warehouse/:warehouseId',  ...auth, ctrl.getByWarehouse);   // Admin/NV
router.post('/import',                 ...auth, ctrl.importStock);      // Admin/NV
router.post('/export',                 ...auth, ctrl.exportStock);      // Admin/NV

module.exports = router;
