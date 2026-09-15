// 从 user.json 恢复原始密码哈希到 PGlite
import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const DATA_DIR = path.resolve('pg-local-data');
const USER_JSON = path.resolve('data-export/json/user.json');

async function main() {
  const users = JSON.parse(fs.readFileSync(USER_JSON, 'utf8'));
  console.log(`从 user.json 读取 ${users.length} 个用户的原始密码`);

  const db = new PGlite(DATA_DIR);
  await db.waitReady;
  console.log('PGlite 已打开');

  for (const u of users) {
    await db.query('UPDATE "user" SET password = $1 WHERE id = $2', [u.password, u.id]);
    console.log(`  ✓ ${u.username} (id=${u.id}): 密码已恢复为 ${u.password.slice(0, 15)}...`);
  }

  // 验证
  const { rows } = await db.query('SELECT id, username, password FROM "user" ORDER BY id');
  console.log('\n=== 验证：当前数据库中的密码 ===');
  for (const r of rows) {
    console.log(`  ${r.username.padEnd(8)} ${r.password.slice(0, 25)}...`);
  }

  await db.close();
  console.log('\n✓ 原始密码恢复完成');
}

main().catch(e => {
  console.error('错误:', e);
  process.exit(1);
});
