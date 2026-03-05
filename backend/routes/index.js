// ═══════════════════════════════════════════════════════════════
// Routes: Tổng hợp tất cả routes
// ═══════════════════════════════════════════════════════════════
const router = require('express').Router();

router.use('/auth',             require('./auth.routes'));
router.use('/users',            require('./user.routes'));
router.use('/branches',         require('./branch.routes'));
router.use('/courts',           require('./court.routes'));
router.use('/products',         require('./product.routes'));
router.use('/bookings',         require('./booking.routes'));
router.use('/orders',           require('./order.routes'));
router.use('/inventory',        require('./inventory.routes'));
router.use('/transfers',        require('./transfer.routes'));
router.use('/purchase-orders',  require('./purchase-order.routes'));
router.use('/sales-orders',     require('./sales-order.routes'));

// API docs endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'BadmintonHub API',
    version: '1.0.0',
    endpoints: {
      auth:             'POST /api/auth/login, /register, GET /me',
      users:            'GET|POST /api/users, GET|PUT|DELETE /api/users/:id',
      branches:         'GET /api/branches',
      courts:           'GET /api/courts, /api/courts/:id/slots?date=',
      products:         'GET /api/products?category=&brand=&search=',
      bookings:         'GET|POST /api/bookings',
      orders:           'GET|POST /api/orders',
      inventory:        'GET /api/inventory, POST /import, /export',
      transfers:        'GET|POST /api/transfers',
      'purchase-orders':'GET|POST /api/purchase-orders',
      'sales-orders':   'GET|POST /api/sales-orders'
    }
  });
});

module.exports = router;
