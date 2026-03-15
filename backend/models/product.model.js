// ═══════════════════════════════════════════════════════════════
// Model: Products (products + product_badges + product_images)
// ═══════════════════════════════════════════════════════════════
const { query } = require('../config/database');

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

function pickCodeByMap(source, mapping, fallbackLength) {
  for (const entry of mapping) {
    if (entry.keys.some((key) => source.includes(normalizeCodeSource(key)))) {
      return entry.code;
    }
  }
  const fallback = source.slice(0, fallbackLength);
  return fallback.padEnd(fallbackLength, 'X');
}

function buildSkuPrefix(brand, category) {
  const normalizedBrand = normalizeCodeSource(brand || '');
  const normalizedCategory = normalizeCodeSource(category || '');

  const brandCode = pickCodeByMap(normalizedBrand, BRAND_CODE_MAP, 2);
  const categoryCode = pickCodeByMap(normalizedCategory, CATEGORY_CODE_MAP, 1);

  return `${categoryCode}${brandCode}`;
}

function buildSkuCandidate(prefix, sequence) {
  return `${prefix}-${String(sequence).padStart(4, '0')}`.slice(0, 20);
}

async function generateUniqueSku(brand, category) {
  const prefix = buildSkuPrefix(brand, category);
  const existedWithPrefix = await query(
    'SELECT sku FROM products WHERE sku LIKE $1',
    [`${prefix}-%`]
  );

  let nextSeq = 1;
  const prefixRegex = new RegExp(`^${prefix}-(\\d{1,6})$`);
  for (const row of existedWithPrefix.rows) {
    const rawSku = String(row.sku || '').toUpperCase();
    const match = rawSku.match(prefixRegex);
    if (!match) continue;
    const seq = parseInt(match[1], 10);
    if (!Number.isNaN(seq) && seq >= nextSeq) nextSeq = seq + 1;
  }

  for (let i = 0; i < 200; i++) {
    const candidate = buildSkuCandidate(prefix, nextSeq + i);
    const existed = await query('SELECT 1 FROM products WHERE sku = $1 LIMIT 1', [candidate]);
    if (existed.rows.length === 0) return candidate;
  }

  return `${prefix}-${Date.now().toString().slice(-6)}`.slice(0, 20);
}

const Product = {
  // Lấy danh sách sản phẩm (có filter + phân trang)
  findAll: async ({ category, brand, gender, search, page = 1, limit = 20 } = {}) => {
    let where = ['TRUE'];
    const values = [];
    let idx = 1;

    if (category) { where.push(`p.category = $${idx++}`); values.push(category); }
    if (brand)    { where.push(`p.brand = $${idx++}`); values.push(brand); }
    if (gender)   { where.push(`p.gender = $${idx++}`); values.push(gender); }
    if (search) {
      where.push(`(p.name ILIKE $${idx} OR p.brand ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    const whereClause = where.join(' AND ');

    // Count
    const countSql = `SELECT COUNT(*) FROM products p WHERE ${whereClause}`;
    const countResult = await query(countSql, values);
    const total = parseInt(countResult.rows[0].count);

    // Data
    let sql = `SELECT p.* FROM products p WHERE ${whereClause} ORDER BY p.id`;
    sql += ` LIMIT $${idx} OFFSET $${idx + 1}`;
    values.push(limit, (page - 1) * limit);

    const result = await query(sql, values);

    // Lấy badges cho từng sản phẩm
    for (const product of result.rows) {
      const badges = await query('SELECT badge FROM product_badges WHERE product_id = $1', [product.id]);
      product.badges = badges.rows.map(r => r.badge);
    }

    return { data: result.rows, total };
  },

  // Lấy 1 sản phẩm
  findById: async (id) => {
    const sql = `SELECT * FROM products WHERE id = $1`;
    const result = await query(sql, [id]);
    if (result.rows.length === 0) return null;

    const product = result.rows[0];

    // Badges
    const badges = await query('SELECT badge FROM product_badges WHERE product_id = $1', [id]);
    product.badges = badges.rows.map(r => r.badge);

    // Images
    const images = await query('SELECT url, sort_order FROM product_images WHERE product_id = $1 ORDER BY sort_order', [id]);
    product.images = images.rows;

    return product;
  },

  // Tìm theo SKU
  findBySku: async (sku) => {
    const sql = `SELECT * FROM products WHERE sku = $1`;
    const result = await query(sql, [sku]);
    return result.rows[0] || null;
  },

  // Lấy danh mục (distinct)
  getCategories: async () => {
    const result = await query('SELECT DISTINCT category FROM products ORDER BY category');
    return result.rows.map(r => r.category);
  },

  // Lấy thương hiệu (distinct)
  getBrands: async () => {
    const result = await query('SELECT DISTINCT brand FROM products ORDER BY brand');
    return result.rows.map(r => r.brand);
  },

  // Tạo sản phẩm (admin)
  create: async (data) => {
    const { sku, name, brand, category, price, original_price, image, description, specs, features, in_stock, gender, badges = [] } = data;
    const finalSku = String(sku || '').trim().toUpperCase() || await generateUniqueSku(brand, category);

    const sql = `INSERT INTO products (sku, name, brand, category, price, original_price, image, description, specs, features, in_stock, gender)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`;
    const result = await query(sql, [finalSku, name, brand, category, price, original_price, image || null,
      description, specs ? JSON.stringify(specs) : null, features ? JSON.stringify(features) : null, in_stock, gender]);

    const product = result.rows[0];
    for (const badge of badges) {
      await query('INSERT INTO product_badges (product_id, badge) VALUES ($1, $2)', [product.id, badge]);
    }
    product.badges = badges;
    return product;
  },

  // Cập nhật sản phẩm
  update: async (id, data) => {
    const { name, brand, category, price, original_price, image, description, specs, features, in_stock, gender } = data;
    const sql = `UPDATE products SET
                 name = COALESCE($1, name), brand = COALESCE($2, brand), category = COALESCE($3, category),
                 price = COALESCE($4, price), original_price = $5, image = COALESCE($6, image), description = COALESCE($7, description),
                 specs = COALESCE($8, specs), features = COALESCE($9, features),
                 in_stock = COALESCE($10, in_stock), gender = $11, updated_at = NOW()
                 WHERE id = $12 RETURNING *`;
    const result = await query(sql, [name, brand, category, price, original_price, image || null, description,
      specs ? JSON.stringify(specs) : null, features ? JSON.stringify(features) : null, in_stock, gender, id]);
    return result.rows[0] || null;
  },

  delete: async (id) => {
    const sql = `DELETE FROM products WHERE id = $1 RETURNING *`;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }
};

module.exports = Product;
