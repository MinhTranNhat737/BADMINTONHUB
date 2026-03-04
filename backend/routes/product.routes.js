// ═══════════════════════════════════════════════════════════════
// Routes: Products
// ═══════════════════════════════════════════════════════════════
const router = require('express').Router();
const ctrl   = require('../controllers/product.controller');
const { authenticate }  = require('../middlewares/auth.middleware');
const { authorize }     = require('../middlewares/role.middleware');

router.get('/',            ctrl.getAll);                                        // Public
router.get('/categories',  ctrl.getCategories);                                 // Public
router.get('/brands',      ctrl.getBrands);                                     // Public
router.get('/:id',         ctrl.getById);                                       // Public
router.post('/',           authenticate, authorize('admin'), ctrl.create);       // Admin
router.put('/:id',         authenticate, authorize('admin'), ctrl.update);       // Admin

module.exports = router;
