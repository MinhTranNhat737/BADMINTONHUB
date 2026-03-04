// Script tạm: cập nhật password hash cho seed users
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { query } = require('../config/database');

async function fixPasswords() {
  const accounts = [
    ['admin', 'admin123'],
    ['nhanvien1', 'nhanvien123'],
    ['nhanvien2', 'nhanvien123'],
    ['nhanvien3', 'nhanvien123'],
    ['nvhub', 'nhanvien123'],
  ];

  for (const [username, password] of accounts) {
    const hash = await bcrypt.hash(password, 10);
    await query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, username]);
    console.log('Updated:', username);
  }

  console.log('Done!');
  process.exit(0);
}

fixPasswords().catch(err => {
  console.error(err);
  process.exit(1);
});
