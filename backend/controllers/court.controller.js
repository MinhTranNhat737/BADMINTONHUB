// ═══════════════════════════════════════════════════════════════
// Controller: Courts
// ═══════════════════════════════════════════════════════════════
const Court   = require('../models/court.model');
const Booking = require('../models/booking.model');
const Review  = require('../models/review.model');
const { success, created } = require('../utils/response');

// GET /api/courts
const getAll = async (req, res, next) => {
  try {
    const { branchId, type, indoor } = req.query;
    const courts = await Court.findAll({
      branchId: branchId ? parseInt(branchId) : undefined,
      type,
      indoor: indoor !== undefined ? indoor === 'true' : undefined
    });
    return success(res, courts);
  } catch (err) { next(err); }
};

// GET /api/courts/:id
const getById = async (req, res, next) => {
  try {
    const court = await Court.findById(req.params.id);
    if (!court) return res.status(404).json({ success: false, message: 'Không tìm thấy sân' });
    return success(res, court);
  } catch (err) { next(err); }
};

// GET /api/courts/:id/slots?date=2026-03-04
const getSlots = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'Thiếu tham số date' });
    const slots = await Booking.getSlots(req.params.id, date);
    return success(res, slots);
  } catch (err) { next(err); }
};

// GET /api/courts/:id/reviews
const getReviews = async (req, res, next) => {
  try {
    const reviews = await Review.findByCourt(req.params.id);
    return success(res, reviews);
  } catch (err) { next(err); }
};

// POST /api/courts/:id/reviews (user đã đăng nhập)
const createReview = async (req, res, next) => {
  try {
    const review = await Review.create({
      user_id: req.user.id,
      court_id: parseInt(req.params.id),
      rating: req.body.rating,
      content: req.body.content
    });
    return created(res, review, 'Đánh giá thành công');
  } catch (err) { next(err); }
};

// POST /api/courts (admin)
const create = async (req, res, next) => {
  try {
    const court = await Court.create(req.body);
    return created(res, court, 'Tạo sân thành công');
  } catch (err) { next(err); }
};

// PUT /api/courts/:id (admin)
const update = async (req, res, next) => {
  try {
    const court = await Court.update(req.params.id, req.body);
    if (!court) return res.status(404).json({ success: false, message: 'Không tìm thấy sân' });
    return success(res, court, 'Cập nhật sân thành công');
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, getSlots, getReviews, createReview, create, update };
