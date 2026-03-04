// ═══════════════════════════════════════════════════════════════
// Model: Courts (courts + court_amenities)
// ═══════════════════════════════════════════════════════════════
const { query } = require('../config/database');

const Court = {
  // Lấy tất cả sân (kèm chi nhánh + tiện ích)
  findAll: async ({ branchId, type, indoor } = {}) => {
    let sql = `SELECT c.*, b.name AS branch_name, b.address AS branch_address
               FROM courts c
               JOIN branches b ON b.id = c.branch_id
               WHERE c.available = TRUE`;
    const values = [];
    let idx = 1;

    if (branchId) {
      sql += ` AND c.branch_id = $${idx++}`;
      values.push(branchId);
    }
    if (type) {
      sql += ` AND c.type = $${idx++}`;
      values.push(type);
    }
    if (indoor !== undefined) {
      sql += ` AND c.indoor = $${idx++}`;
      values.push(indoor);
    }

    sql += ` ORDER BY c.branch_id, c.id`;
    const result = await query(sql, values);

    // Lấy tiện ích cho từng sân
    for (const court of result.rows) {
      const amenities = await query(
        'SELECT amenity FROM court_amenities WHERE court_id = $1', [court.id]
      );
      court.amenities = amenities.rows.map(r => r.amenity);
    }

    return result.rows;
  },

  // Lấy 1 sân theo ID
  findById: async (id) => {
    const sql = `SELECT c.*, b.name AS branch_name, b.address AS branch_address,
                        b.lat AS branch_lat, b.lng AS branch_lng
                 FROM courts c
                 JOIN branches b ON b.id = c.branch_id
                 WHERE c.id = $1`;
    const result = await query(sql, [id]);
    if (result.rows.length === 0) return null;

    const court = result.rows[0];
    const amenities = await query(
      'SELECT amenity FROM court_amenities WHERE court_id = $1', [id]
    );
    court.amenities = amenities.rows.map(r => r.amenity);

    return court;
  },

  // Lấy sân theo chi nhánh
  findByBranch: async (branchId) => {
    return Court.findAll({ branchId });
  },

  // Tạo sân mới (admin)
  create: async ({ name, branch_id, type, indoor, price, description, hours, amenities = [] }) => {
    const sql = `INSERT INTO courts (name, branch_id, type, indoor, price, description, hours)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
    const result = await query(sql, [name, branch_id, type, indoor, price, description, hours]);
    const court = result.rows[0];

    // Thêm tiện ích
    for (const amenity of amenities) {
      await query('INSERT INTO court_amenities (court_id, amenity) VALUES ($1, $2)', [court.id, amenity]);
    }
    court.amenities = amenities;

    return court;
  },

  // Cập nhật sân
  update: async (id, fields) => {
    const { name, type, indoor, price, description, hours, available, amenities } = fields;
    const sql = `UPDATE courts SET 
                 name = COALESCE($1, name), type = COALESCE($2, type),
                 indoor = COALESCE($3, indoor), price = COALESCE($4, price),
                 description = COALESCE($5, description), hours = COALESCE($6, hours),
                 available = COALESCE($7, available), updated_at = NOW()
                 WHERE id = $8 RETURNING *`;
    const result = await query(sql, [name, type, indoor, price, description, hours, available, id]);

    // Cập nhật tiện ích nếu có
    if (amenities && Array.isArray(amenities)) {
      await query('DELETE FROM court_amenities WHERE court_id = $1', [id]);
      for (const amenity of amenities) {
        await query('INSERT INTO court_amenities (court_id, amenity) VALUES ($1, $2)', [id, amenity]);
      }
    }

    return result.rows[0] || null;
  }
};

module.exports = Court;
