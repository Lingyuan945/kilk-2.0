// 为 user 表生成全新随机密码，替换旧 bcrypt/md5 哈希
// 输出：更新后的 postgresql_migration.sql + 密码清单 passwords.csv
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const EXPORT_DIR = path.resolve('data-export');
const JSON_DIR = path.join(EXPORT_DIR, 'json');
const SQL_FILE = path.join(EXPORT_DIR, 'postgresql_migration.sql');
const PWD_FILE = path.join(EXPORT_DIR, 'passwords.csv');

// 随机密码：10 位，避开易混淆字符
const CHARS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
function randomPassword(len = 10) {
  let s = '';
  const buf = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) {
    s += CHARS[buf[i] % CHARS.length];
  }
  return s;
}

function main() {
  const users = JSON.parse(fs.readFileSync(path.join(JSON_DIR, 'user.json'), 'utf8'));
  const sql = fs.readFileSync(SQL_FILE, 'utf8');

  // 为每个用户生成新密码和 bcrypt 哈希
  const newPasswords = {};
  for (const u of users) {
    const pwd = randomPassword();
    newPasswords[u.id] = { username: u.username, name: u.name, password: pwd, hash: bcrypt.hashSync(pwd, 10) };
    console.log(`用户 ${u.username} (${u.name}): 新密码 ${pwd}`);
  }

  // 替换 SQL 中的 password 值
  let newSql = sql;
  for (const u of users) {
    const oldHash = u.password;
    if (!oldHash) continue;
    // 替换 INSERT 中的旧哈希为新哈希（精确匹配，避免误伤）
    newSql = newSql.split(oldHash).join(newPasswords[u.id].hash);
  }

  fs.writeFileSync(SQL_FILE, newSql, 'utf8');

  // 密码清单
  const csvLines = ['username,name,new_password,role'];
  for (const u of users) {
    const p = newPasswords[u.id];
    csvLines.push(`${p.username},${p.name},${p.password},${u.role}`);
  }
  fs.writeFileSync(PWD_FILE, csvLines.join('\n'), 'utf-8');

  console.log('\n完成！');
  console.log(`迁移 SQL 已更新: ${SQL_FILE} (密码已替换为新 bcrypt 哈希)`);
  console.log(`密码清单: ${PWD_FILE} (请妥善保管)`);
}

main();
