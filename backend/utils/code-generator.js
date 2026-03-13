// ═══════════════════════════════════════════════════════════════
// Utility: Sinh mã riêng biệt cho các thực thể giao dịch
// Format: {PREFIX}-{YYMMDD}-{XXXX}
// Ví dụ: DH-260313-0001, BH-260313-0002, PO-260313-0001
// ═══════════════════════════════════════════════════════════════

/**
 * Sinh mã giao dịch duy nhất theo ngày
 * @param {object} client - PostgreSQL client (trong transaction)
 * @param {string} prefix - Tiền tố (DH, BH, PO, DC)
 * @param {string} tableName - Tên bảng
 * @param {string} codeColumn - Tên cột chứa mã
 * @returns {string} Mã mới, VD: DH-260313-0001
 */
async function generateCode(client, prefix, tableName, codeColumn) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateStr = `${yy}${mm}${dd}`;
  const pattern = `${prefix}-${dateStr}-%`;

  const result = await client.query(
    `SELECT ${codeColumn} FROM ${tableName} WHERE ${codeColumn} LIKE $1 ORDER BY ${codeColumn} DESC LIMIT 1`,
    [pattern]
  );

  let seq = 1;
  if (result.rows.length > 0) {
    const lastCode = result.rows[0][codeColumn];
    const lastSeq = parseInt(lastCode.split('-').pop(), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}-${dateStr}-${String(seq).padStart(4, '0')}`;
}

module.exports = { generateCode };
