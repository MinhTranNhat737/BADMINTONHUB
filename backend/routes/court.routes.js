// ═══════════════════════════════════════════════════════════════
// Routes: Courts
// ═══════════════════════════════════════════════════════════════
const router = require('express').Router();
const ctrl   = require('../controllers/court.controller');
const { authenticate }  = require('../middlewares/auth.middleware');
const { authorize }     = require('../middlewares/role.middleware');

router.get('/',             ctrl.getAll);                                       // Public
router.get('/:id',          ctrl.getById);                                      // Public
router.get('/:id/slots',    ctrl.getSlots);                                     // Public
router.get('/:id/reviews',  ctrl.getReviews);                                   // Public
router.post('/:id/reviews', authenticate, ctrl.createReview);                   // User đăng nhập
router.post('/',            authenticate, authorize('admin'), ctrl.create);      // Admin
router.put('/:id',          authenticate, authorize('admin'), ctrl.update);      // Admin

module.exports = router;
