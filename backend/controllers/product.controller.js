// ═══════════════════════════════════════════════════════════════
// Controller: Products
// ═══════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Product = require('../models/product.model');
const { success, created, paginated } = require('../utils/response');

const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mime = String(file.mimetype || '').toLowerCase();
    if (mime.startsWith('image/')) return cb(null, true);
    return cb(new Error('Chỉ hỗ trợ file ảnh')); 
  },
}).single('image');

function runUpload(req, res) {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function sanitizeProduct(raw) {
  if (!raw) return raw;

  const segments = String(raw.description || '')
    .split('|')
    .map((segment) => segment.trim())
    .filter(Boolean);

  let supplier_name = null;
  const cleanSegments = [];

  for (const segment of segments) {
    if (segment.startsWith('NCC:')) {
      supplier_name = segment.slice(4).trim() || null;
      continue;
    }
    cleanSegments.push(segment);
  }

  return {
    ...raw,
    supplier_name,
    description: cleanSegments.join(' | '),
  };
}

// GET /api/products
const getAll = async (req, res, next) => {
  try {
    const { category, brand, gender, search, page = 1, limit = 20 } = req.query;
    const result = await Product.findAll({
      category, brand, gender, search,
      page: parseInt(page), limit: parseInt(limit)
    });
    return paginated(res, {
      ...result,
      data: result.data.map(sanitizeProduct),
      page: parseInt(page),
      limit: parseInt(limit),
    });
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
    return success(res, sanitizeProduct(product));
  } catch (err) { next(err); }
};

// POST /api/products (admin)
const create = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    return created(res, sanitizeProduct(product), 'Tạo sản phẩm thành công');
  } catch (err) { next(err); }
};

// PUT /api/products/:id (admin)
const update = async (req, res, next) => {
  try {
    const product = await Product.update(req.params.id, req.body);
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    return success(res, sanitizeProduct(product), 'Cập nhật thành công');
  } catch (err) { next(err); }
};

// DELETE /api/products/:id (admin)
const remove = async (req, res, next) => {
  try {
    const product = await Product.delete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    return success(res, sanitizeProduct(product), 'Xóa sản phẩm thành công');
  } catch (err) { next(err); }
};

// POST /api/products/upload-image (admin)
const uploadImage = async (req, res, next) => {
  try {
    await runUpload(req, res);
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Không có file ảnh' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const url = `${baseUrl}/uploads/products/${req.file.filename}`;
    return success(res, { url, filename: req.file.filename }, 'Tải ảnh thành công');
  } catch (err) {
    if (err && err.message) {
      return res.status(400).json({ success: false, message: err.message });
    }
    return next(err);
  }
};

module.exports = { getAll, getCategories, getBrands, getById, create, update, remove, uploadImage };
