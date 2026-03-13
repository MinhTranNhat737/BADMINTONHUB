// ═══════════════════════════════════════════════════════════════
// Migration: Thêm cột mã riêng biệt cho orders, sales_orders,
//            purchase_orders, transfer_requests
// Chạy: node backend/scripts/add-entity-codes.js
// ═══════════════════════════════════════════════════════════════
const { query, getClient } = require('../config/database');

const ENTITIES = [
  { table: 'orders',            column: 'order_code',    prefix: 'DH' },
  { table: 'sales_orders',      column: 'sales_code',    prefix: 'BH' },
  { table: 'purchase_orders',   column: 'po_code',       prefix: 'PO' },
  { table: 'transfer_requests', column: 'transfer_code', prefix: 'DC' },
];

async function run() {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    for (const { table, column, prefix } of ENTITIES) {
      // 1. Thêm cột nếu chưa có
      await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} VARCHAR(20)`);
      console.log(`[+] ${table}.${column} - cột đã sẵn sàng`);

      // 2. Backfill mã cho bản ghi cũ (chưa có mã)
      const rows = await client.query(
        `SELECT id, created_at FROM ${table} WHERE ${column} IS NULL ORDER BY created_at ASC`
      );

      if (rows.rows.length > 0) {
        // Nhóm theo ngày để sinh sequence chính xác
        const dateSeq = {};
        for (const row of rows.rows) {
          const d = new Date(row.created_at);
          const yy = String(d.getFullYear()).slice(2);
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const dateStr = `${yy}${mm}${dd}`;

          if (!dateSeq[dateStr]) {
            // Kiểm tra mã cao nhất đã có trong ngày này
            const existing = await client.query(
              `SELECT ${column} FROM ${table} WHERE ${column} LIKE $1 ORDER BY ${column} DESC LIMIT 1`,
              [`${prefix}-${dateStr}-%`]
            );
            if (existing.rows.length > 0) {
              const lastSeq = parseInt(existing.rows[0][column].split('-').pop(), 10);
              dateSeq[dateStr] = isNaN(lastSeq) ? 0 : lastSeq;
            } else {
              dateSeq[dateStr] = 0;
            }
          }

          dateSeq[dateStr]++;
          const code = `${prefix}-${dateStr}-${String(dateSeq[dateStr]).padStart(4, '0')}`;

          await client.query(
            `UPDATE ${table} SET ${column} = $1 WHERE id = $2`,
            [code, row.id]
          );
        }
        console.log(`    Backfill ${rows.rows.length} bản ghi`);
      } else {
        console.log(`    Không có bản ghi cần backfill`);
      }

      // 3. Thêm UNIQUE constraint (bỏ qua nếu đã tồn tại)
      const constraintName = `uq_${table}_${column}`;
      await client.query(`
        DO $$ BEGIN
          ALTER TABLE ${table} ADD CONSTRAINT ${constraintName} UNIQUE (${column});
        EXCEPTION
          WHEN duplicate_table THEN NULL;
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

      // 4. Thêm index để tìm kiếm nhanh
      const indexName = `idx_${table}_${column}`;
      await client.query(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${table}(${column})`);

      console.log(`    UNIQUE constraint + index OK`);
    }

    await client.query('COMMIT');
    console.log('\n✅ Migration hoàn tất!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi migration:', err.message);
    throw err;
  } finally {
    client.release();
    process.exit(0);
  }
}

run();
