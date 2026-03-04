// ═══════════════════════════════════════════════════════════════
// BADMINTONHUB - Kết nối PostgreSQL
// Sử dụng pg Pool để quản lý connection
// ═══════════════════════════════════════════════════════════════
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'BADMINTONHUB',
  user:     process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '18112003',
  // Connection pool settings
  max: 20,                    // Tối đa 20 connections
  idleTimeoutMillis: 30000,   // Đóng connection idle sau 30s
  connectionTimeoutMillis: 5000, // Timeout kết nối 5s
});

// Log khi kết nối thành công
pool.on('connect', () => {
  console.log('📦 Kết nối PostgreSQL thành công');
});

// Log lỗi
pool.on('error', (err) => {
  console.error('❌ Lỗi PostgreSQL:', err.message);
});

// Helper: chạy query đơn giản
const query = (text, params) => pool.query(text, params);

// Helper: lấy 1 client từ pool (dùng cho transaction)
const getClient = () => pool.connect();

// Test kết nối
const testConnection = async () => {
  try {
    console.log('🔌 Đang kết nối tới PostgreSQL...');
    console.log(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    console.log(`   User: ${process.env.DB_USER}`);
    const res = await pool.query('SELECT NOW() AS current_time');
    console.log('✅ Database time:', res.rows[0].current_time);
    return true;
  } catch (err) {
    console.error('❌ Không thể kết nối database:', err.code, err.message);
    console.error('   Chi tiết:', JSON.stringify({ host: process.env.DB_HOST, port: process.env.DB_PORT, db: process.env.DB_NAME, user: process.env.DB_USER }));
    return false;
  }
};

module.exports = { pool, query, getClient, testConnection };
