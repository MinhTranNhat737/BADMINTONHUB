// ═══════════════════════════════════════════════════════════════
// Helper: format response thống nhất
// ═══════════════════════════════════════════════════════════════

const success = (res, data, message = 'Thành công', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const paginated = (res, { data, total, page, limit }) => {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
};

const created = (res, data, message = 'Tạo mới thành công') => {
  return success(res, data, message, 201);
};

module.exports = { success, paginated, created };
