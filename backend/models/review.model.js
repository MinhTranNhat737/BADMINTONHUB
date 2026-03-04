// ═══════════════════════════════════════════════════════════════
// Model: Reviews (reviews)
// ═══════════════════════════════════════════════════════════════
const { query } = require('../config/database');

const Review = {
  // Lấy đánh giá của 1 sân
  findByCourt: async (courtId) => {
    const sql = `SELECT r.*, u.full_name AS user_name
                 FROM reviews r
                 JOIN users u ON u.id = r.user_id
                 WHERE r.court_id = $1
                 ORDER BY r.created_at DESC`;
    const result = await query(sql, [courtId]);
    return result.rows;
  },

  // Tạo đánh giá
  create: async ({ user_id, court_id, rating, content }) => {
    const sql = `INSERT INTO reviews (user_id, court_id, rating, content)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (user_id, court_id) DO UPDATE SET rating = $3, content = $4, created_at = NOW()
                 RETURNING *`;
    const result = await query(sql, [user_id, court_id, rating, content]);

    // Cập nhật rating trung bình của sân
    await query(
      `UPDATE courts SET rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE court_id = $1),
       reviews_count = (SELECT COUNT(*) FROM reviews WHERE court_id = $1)
       WHERE id = $1`, [court_id]
    );

    return result.rows[0];
  }
};

module.exports = Review;
