// ═══════════════════════════════════════════════════════════════
// Controller: Products
// ═══════════════════════════════════════════════════════════════
const Product = require('../models/product.model');
const { success, created, paginated } = require('../utils/response');

// GET /api/products
const getAll = async (req, res, next) => {
  try {
    const { category, brand, gender, search, page = 1, limit = 20 } = req.query;
    const result = await Product.findAll({
      category, brand, gender, search,
      page: parseInt(page), limit: parseInt(limit)
    });
    return paginated(res, { ...result, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

// GET /api/products/categories
const getCategories = async (req, res, next) => {
  try {
    const categories = await Product.getCategories();
    return success(res, categories);
  } catch (err) { next(err); }
};

// GET /api/products/brands
const getBrands = async (req, res, next) => {
  try {
    const brands = await Product.getBrands();
    return success(res, brands);
  } catch (err) { next(err); }
};

// GET /api/products/:id
const getById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    return success(res, product);
  } catch (err) { next(err); }
};

// POST /api/products (admin)
const create = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    return created(res, product, 'Tạo sản phẩm thành công');
  } catch (err) { next(err); }
};

// PUT /api/products/:id (admin)
const update = async (req, res, next) => {
  try {
    const product = await Product.update(req.params.id, req.body);
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    return success(res, product, 'Cập nhật thành công');
  } catch (err) { next(err); }
};

module.exports = { getAll, getCategories, getBrands, getById, create, update };
