/**
 * Migration: Chuẩn hóa SKU + note hệ thống theo chuẩn viết tắt mới
 *
 * Run dry-run:
 *   node backend/scripts/migrate-sku-note-format.js --dry-run
 *
 * Run apply:
 *   node backend/scripts/migrate-sku-note-format.js
 */

require('dotenv').config();
const { getClient } = require('../config/database');

function normalizeCodeSource(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

const BRAND_CODE_MAP = [
  { keys: ['YONEX', 'YNX'], code: 'YN' },
  { keys: ['VICTOR', 'VIC'], code: 'VT' },
  { keys: ['LINING', 'LI NING', 'LNING'], code: 'LN' },
  { keys: ['MIZUNO'], code: 'MZ' },
  { keys: ['ADIDAS'], code: 'AD' },
  { keys: ['ASICS'], code: 'AS' },
  { keys: ['KAWASAKI'], code: 'KW' },
  { keys: ['APACS'], code: 'AP' },
  { keys: ['FLEET'], code: 'FL' },
  { keys: ['FELET'], code: 'FT' },
  { keys: ['BABOLAT'], code: 'BB' },
  { keys: ['KUMPOO'], code: 'KP' },
];

const CATEGORY_CODE_MAP = [
  { keys: ['VOT', 'RACKET'], code: 'V' },
  { keys: ['GIAY', 'SHOE', 'SHOES'], code: 'G' },
  { keys: ['AO', 'SHIRT', 'TSHIRT', 'JERSEY'], code: 'A' },
  { keys: ['QUAN', 'PANT', 'PANTS', 'SHORT'], code: 'Q' },
  { keys: ['VAY', 'SKIRT'], code: 'Y' },
  { keys: ['TUI', 'BAG'], code: 'T' },
  { keys: ['BALO', 'BACKPACK'], code: 'B' },
  { keys: ['CUOC', 'DAY', 'STRING'], code: 'C' },
  { keys: ['GRIP', 'OVERGRIP', 'QUANCAN'], code: 'R' },
  { keys: ['PHUKIEN', 'ACCESSORY'], code: 'P' },
  { keys: ['CAU', 'SHUTTLE', 'SHUTTLECOCK'], code: 'S' },
];

const SKU_TABLES = ['inventory', 'inventory_transactions', 'transfer_items', 'po_items', 'slip_items'];

const NOTE_TABLES = [
  { table: 'inventory_transactions', idColumn: 'id' },
  { table: 'transfer_requests', idColumn: 'id' },
  { table: 'purchase_orders', idColumn: 'id' },
  { table: 'admin_warehouse_slips', idColumn: 'id' },
  { table: 'sales_orders', idColumn: 'id' },
  { table: 'orders', idColumn: 'id' },
];

function pickCodeByMap(source, mapping, fallbackLength) {
  for (const entry of mapping) {
    if (entry.keys.some((key) => source.includes(normalizeCodeSource(key)))) {
      return entry.code;
    }
  }

  const fallback = source.slice(0, fallbackLength) || ''.padEnd(fallbackLength, 'X');
  return fallback.padEnd(fallbackLength, 'X');
}

function buildSkuPrefix(brand, category) {
  const normalizedBrand = normalizeCodeSource(brand || '');
  const normalizedCategory = normalizeCodeSource(category || '');

  const brandCode = pickCodeByMap(normalizedBrand, BRAND_CODE_MAP, 2);
  const categoryCode = pickCodeByMap(normalizedCategory, CATEGORY_CODE_MAP, 1);

  return `${categoryCode}${brandCode}`;
}

function buildSku(prefix, sequence) {
  return `${prefix}-${String(sequence).padStart(4, '0')}`.slice(0, 20);
}

function normalizeNoteText(raw) {
  if (!raw) return raw;

  let note = String(raw);

  note = note.replace(/Khởi tạo mẫu mã tự động vào kho Hub từ trang quản lý sản phẩm/gi, 'KTMH-HUB-ADM');

  note = note.replace(/Xuất\s+hàng\s+điều\s+chuyển\s+([A-Z0-9-]+)\s+đến\s+([^|]+)/gi, (_, transferId, destination) => {
    return `DC ${String(transferId).toUpperCase()}->${String(destination).trim()}`;
  });

  note = note.replace(/\bXK\s*DC\b/gi, 'XKDC');
  note = note.replace(/\bNK\s*DC\b/gi, 'NKDC');

  note = note.replace(/Xuất\s+kho\s+theo\s+đơn\s+([A-Z0-9-]+)/gi, (_, orderCode) => {
    return `XKDH ${String(orderCode).toUpperCase()}`;
  });

  note = note.replace(/Kèm\s+phiếu\s+bảo\s+hành\s+([A-Z0-9-]+)/gi, (_, warrantyId) => {
    return `PBH ${String(warrantyId).toUpperCase()}`;
  });

  note = note.replace(/\s*\|\s*/g, ' | ');
  note = note.replace(/\s{2,}/g, ' ').trim();

  return note;
}

async function tableExists(client, tableName) {
  const res = await client.query('SELECT to_regclass($1) AS reg', [`public.${tableName}`]);
  return !!res.rows[0]?.reg;
}

async function migrateSku(client, dryRun) {
  const productsRes = await client.query(
    'SELECT id, sku, brand, category FROM products ORDER BY id'
  );

  const products = productsRes.rows;
  if (products.length === 0) {
    return { totalProducts: 0, changedProducts: 0, touchedRowsByTable: {} };
  }

  const nextByPrefix = new Map();
  const usedNewSku = new Set();
  const mappings = [];

  for (let index = 0; index < products.length; index += 1) {
    const row = products[index];
    const prefix = buildSkuPrefix(row.brand, row.category);
    const current = nextByPrefix.get(prefix) || 1;

    let sequence = current;
    let candidate = buildSku(prefix, sequence);
    while (usedNewSku.has(candidate)) {
      sequence += 1;
      candidate = buildSku(prefix, sequence);
    }

    nextByPrefix.set(prefix, sequence + 1);
    usedNewSku.add(candidate);

    mappings.push({
      id: row.id,
      oldSku: String(row.sku || '').toUpperCase(),
      newSku: candidate,
      tempSku: `TMPMIG-${String(index + 1).padStart(6, '0')}`.slice(0, 20),
    });
  }

  const changedMappings = mappings.filter((m) => m.oldSku !== m.newSku);

  if (dryRun) {
    return {
      totalProducts: products.length,
      changedProducts: changedMappings.length,
      touchedRowsByTable: {},
      sample: changedMappings.slice(0, 20),
    };
  }

  if (changedMappings.length === 0) {
    return { totalProducts: products.length, changedProducts: 0, touchedRowsByTable: {} };
  }

  for (const item of changedMappings) {
    await client.query('UPDATE products SET sku = $1 WHERE id = $2', [item.tempSku, item.id]);
  }

  const touchedRowsByTable = {};

  for (const table of SKU_TABLES) {
    if (!(await tableExists(client, table))) {
      touchedRowsByTable[table] = 0;
      continue;
    }

    let tableTouched = 0;
    for (const item of changedMappings) {
      const res = await client.query(`UPDATE ${table} SET sku = $1 WHERE sku = $2`, [item.tempSku, item.oldSku]);
      tableTouched += res.rowCount;
    }
    touchedRowsByTable[table] = tableTouched;
  }

  for (const item of changedMappings) {
    await client.query('UPDATE products SET sku = $1 WHERE id = $2', [item.newSku, item.id]);
  }

  for (const table of SKU_TABLES) {
    if (!(await tableExists(client, table))) continue;

    for (const item of changedMappings) {
      await client.query(`UPDATE ${table} SET sku = $1 WHERE sku = $2`, [item.newSku, item.tempSku]);
    }
  }

  return {
    totalProducts: products.length,
    changedProducts: changedMappings.length,
    touchedRowsByTable,
    sample: changedMappings.slice(0, 20),
  };
}

async function migrateNotes(client, dryRun) {
  const summary = {};

  for (const { table, idColumn } of NOTE_TABLES) {
    if (!(await tableExists(client, table))) {
      summary[table] = 0;
      continue;
    }

    const rowsRes = await client.query(
      `SELECT ${idColumn} AS id, note FROM ${table} WHERE note IS NOT NULL AND LENGTH(TRIM(note)) > 0`
    );

    let changedCount = 0;

    for (const row of rowsRes.rows) {
      const oldNote = String(row.note || '');
      const newNote = normalizeNoteText(oldNote);
      if (newNote === oldNote) continue;

      changedCount += 1;
      if (!dryRun) {
        await client.query(`UPDATE ${table} SET note = $1 WHERE ${idColumn} = $2`, [newNote, row.id]);
      }
    }

    summary[table] = changedCount;
  }

  return summary;
}

async function run() {
  const dryRun = process.argv.includes('--dry-run');
  const client = await getClient();

  try {
    if (!dryRun) await client.query('BEGIN');

    const skuResult = await migrateSku(client, dryRun);
    const noteResult = await migrateNotes(client, dryRun);

    if (!dryRun) await client.query('COMMIT');

    console.log(dryRun ? '🧪 DRY RUN hoàn tất' : '✅ Migration hoàn tất');
    console.log('— SKU —');
    console.log(`  Tổng products: ${skuResult.totalProducts}`);
    console.log(`  Products đổi SKU: ${skuResult.changedProducts}`);
    if (skuResult.sample?.length) {
      console.log('  Mẫu mapping (old -> new):');
      skuResult.sample.forEach((item) => {
        console.log(`    ${item.oldSku} -> ${item.newSku}`);
      });
    }
    Object.entries(skuResult.touchedRowsByTable || {}).forEach(([table, count]) => {
      console.log(`  ${table}: ${count} dòng SKU đã cập nhật`);
    });

    console.log('— NOTE —');
    Object.entries(noteResult).forEach(([table, count]) => {
      console.log(`  ${table}: ${count} dòng note đã chuẩn hóa`);
    });
  } catch (err) {
    if (!dryRun) await client.query('ROLLBACK');
    console.error('❌ Migration lỗi:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    process.exit();
  }
}

run();
