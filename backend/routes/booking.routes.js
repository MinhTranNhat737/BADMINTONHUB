// ═══════════════════════════════════════════════════════════════
// Routes: Bookings
// ═══════════════════════════════════════════════════════════════
const router = require('express').Router();
const ctrl   = require('../controllers/booking.controller');
const { authenticate, optionalAuth } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.get('/',             authenticate, authorize('admin', 'employee'), ctrl.getAll);       // Admin/NV
router.get('/my',           authenticate, ctrl.getMyBookings);                                // User
router.get('/:id',          authenticate, ctrl.getById);                                      // Auth
router.post('/',            optionalAuth, ctrl.create);                                       // Khách vãng lai + User
router.patch('/:id/status', authenticate, authorize('admin', 'employee'), ctrl.updateStatus); // Admin/NV
router.delete('/:id',       authenticate, authorize('admin'), ctrl.deleteBooking);            // Admin

module.exports = router;
