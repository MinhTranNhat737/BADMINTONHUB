// ═══════════════════════════════════════════════════════════════
// BADMINTONHUB - Entry Point
// MVC Architecture với Express + PostgreSQL
// ═══════════════════════════════════════════════════════════════
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');

const { testConnection } = require('./config/database');
const routes             = require('./routes');
const { errorHandler }   = require('./middlewares/error.middleware');
const Booking            = require('./models/booking.model');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware toàn cục ──────────────────────────────────────
app.set('etag', false);                     // Tắt ETag → luôn trả 200, không 304
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
  contentSecurityPolicy: false,
}));
app.use(cors({ origin: 'http://localhost:3000', credentials: true })); // Cho phép frontend
app.use(morgan('dev'));                     // Log request
app.use(express.json({ limit: '10mb' }));  // Parse JSON body
app.use(express.urlencoded({ extended: true }));

// ─── Routes ──────────────────────────────────────────────────
app.use('/api', routes);

// ─── Root & Health check ─────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'BadmintonHub API',
    version: '1.0.0',
    status: 'running',
    docs: '/api',
    health: '/health',
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ─── Error handler (luôn đặt cuối cùng) ─────────────────────
app.use(errorHandler);

// ─── Khởi động server ────────────────────────────────────────
const start = async () => {
  // Test kết nối database trước
  const dbOk = await testConnection();
  if (!dbOk) {
    console.error('⛔ Không kết nối được database. Kiểm tra lại .env');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n🏸 BadmintonHub API đang chạy tại http://localhost:${PORT}`);
    console.log(`📋 API docs: http://localhost:${PORT}/api\n`);
  });

  // ─── Cron: Tự động hoàn thành booking hết giờ (mỗi 60 giây) ──
  setInterval(async () => {
    try {
      const completed = await Booking.autoComplete();
      if (completed.length > 0) {
        console.log(`✅ Auto-completed ${completed.length} booking(s):`, completed.map(b => b.booking_code).join(', '));
      }
    } catch (err) {
      console.error('❌ Auto-complete error:', err.message);
    }
  }, 60 * 1000);
};

start();
