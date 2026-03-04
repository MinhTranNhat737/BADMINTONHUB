// ═══════════════════════════════════════════════════════════════
// Model: Products (products + product_badges + product_images)
// ═══════════════════════════════════════════════════════════════
const { query } = require('../config/database');

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
    const { sku, name, brand, category, price, original_price, description, specs, features, in_stock, gender, badges = [] } = data;
    const sql = `INSERT INTO products (sku, name, brand, category, price, original_price, description, specs, features, in_stock, gender)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`;
    const result = await query(sql, [sku, name, brand, category, price, original_price, description,
      specs ? JSON.stringify(specs) : null, features ? JSON.stringify(features) : null, in_stock, gender]);

    const product = result.rows[0];
    for (const badge of badges) {
      await query('INSERT INTO product_badges (product_id, badge) VALUES ($1, $2)', [product.id, badge]);
    }
    product.badges = badges;
    return product;
  },

  // Cập nhật sản phẩm
  update: async (id, data) => {
    const { name, brand, category, price, original_price, description, specs, features, in_stock, gender } = data;
    const sql = `UPDATE products SET
                 name = COALESCE($1, name), brand = COALESCE($2, brand), category = COALESCE($3, category),
                 price = COALESCE($4, price), original_price = $5, description = COALESCE($6, description),
                 specs = COALESCE($7, specs), features = COALESCE($8, features),
                 in_stock = COALESCE($9, in_stock), gender = $10, updated_at = NOW()
                 WHERE id = $11 RETURNING *`;
    const result = await query(sql, [name, brand, category, price, original_price, description,
      specs ? JSON.stringify(specs) : null, features ? JSON.stringify(features) : null, in_stock, gender, id]);
    return result.rows[0] || null;
  }
};

module.exports = Product;
