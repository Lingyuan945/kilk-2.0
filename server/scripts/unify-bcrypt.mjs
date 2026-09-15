// 统一所有密码为 bcrypt $2a$ 格式
// - $2y$ (PHP bcrypt) → $2a$ 前缀替换（算法兼容，密码不变）
// - md5 → 用已知明文重新 bcrypt 哈希
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve('pg-local-data');

// 已知明文的 md5 密码（md5 值 → 明文）
const MD5_PLAINTEXT = {
  'e10adc3949ba59abbe56e057f20f883e': '123456',
};

async function main() {
  const db = new PGlite(DATA_DIR);
  await db.waitReady;
  console.log('PGlite 已打开');

  const { rows } = await db.query('SELECT id, username, password FROM "user" ORDER BY id');

  for (const u of rows) {
    let newHash = u.password;
    let action = '不变';

    if (u.password.startsWith('$2y$')) {
      // PHP bcrypt → Node bcrypt 前缀替换（算法完全兼容）
      newHash = '$2a$' + u.password.slice(4);
      action = '$2y$ → $2a$ 前缀替换';
    } else if (u.password.startsWith('$2a$')) {
      action = '已是 $2a$，不变';
    } else if (u.password.length === 32 && /^[0-9a-fA-F]+$/.test(u.password)) {
      // md5 → 用已知明文重新 bcrypt 哈希
      const plaintext = MD5_PLAINTEXT[u.password];
      if (plaintext) {
        newHash = bcrypt.hashSync(plaintext, 10);
        action = `md5 → bcrypt (明文: ${plaintext})`;
      } else {
        action = 'md5 但未知明文，跳过';
      }
    }

    if (newHash !== u.password) {
      await db.query('UPDATE "user" SET password = $1 WHERE id = $2', [newHash, u.id]);
    }
    console.log(`  [${u.id}] ${u.username.padEnd(8)} ${action}`);
    console.log(`         新哈希: ${newHash.slice(0, 30)}...`);
  }

  // 验证全部是 $2a$
  const { rows: verify } = await db.query('SELECT id, username, password FROM "user" ORDER BY id');
  console.log('\n=== 验证：全部密码格式 ===');
  let allBcrypt = true;
  for (const u of verify) {
    const isBcrypt = u.password.startsWith('$2a$');
    if (!isBcrypt) allBcrypt = false;
    console.log(`  ${u.username.padEnd(8)} ${isBcrypt ? '✓ bcrypt $2a$' : '✗ 非 bcrypt'}  ${u.password.slice(0, 25)}...`);
  }

  await db.close();
  console.log(`\n${allBcrypt ? '✓ 全部密码已统一为 bcrypt $2a$' : '✗ 仍有非 bcrypt 密码'}`);
}

main().catch(e => {
  console.error('错误:', e);
  process.exit(1);
});
