// ═══════════════════════════════════════════════════════════════
// Routes: Bookings
// ═══════════════════════════════════════════════════════════════
const router = require('express').Router();
const ctrl   = require('../controllers/booking.controller');
const { authenticate, optionalAuth } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.get('/',             authenticate, authorize('admin', 'employee'), ctrl.getAll);       // Admin/NV
router.get('/my',           authenticate, ctrl.getMyBookings);                                // User
router.post('/checkin',     authenticate, authorize('admin', 'employee'), ctrl.checkin);      // QR Check-in
router.post('/recurring',   authenticate, authorize('admin', 'employee'), ctrl.createRecurring); // Lịch cố định
router.post('/hold',        optionalAuth, ctrl.createHold);                                   // Giữ chỗ khi đang thanh toán
router.get('/:id',          authenticate, ctrl.getById);                                      // Auth
router.post('/',            optionalAuth, ctrl.create);                                       // Khách vãng lai + User
router.patch('/:id/status', authenticate, authorize('admin', 'employee'), ctrl.updateStatus); // Admin/NV
router.patch('/:id/confirm-payment', authenticate, authorize('admin', 'employee'), ctrl.confirmPayment); // Xác nhận thanh toán
router.patch('/:id/reschedule', authenticate, ctrl.reschedule);                                        // Đổi lịch
router.delete('/:id',       authenticate, authorize('admin','employee'), ctrl.deleteBooking);  // Admin + Employee

module.exports = router;
