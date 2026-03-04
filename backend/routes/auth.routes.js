// ═══════════════════════════════════════════════════════════════
// Routes: Auth
// ═══════════════════════════════════════════════════════════════
const router = require('express').Router();
const ctrl   = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.post('/register',        ctrl.register);
router.post('/login',           ctrl.login);
router.get('/me',               authenticate, ctrl.getProfile);
router.put('/me',               authenticate, ctrl.updateProfile);
router.put('/change-password',  authenticate, ctrl.changePassword);

module.exports = router;
