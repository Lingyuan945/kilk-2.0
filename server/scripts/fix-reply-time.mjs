// 回填 forum_reply.create_time（从原 JSON 的 reply_time）
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const replies = JSON.parse(readFileSync(path.resolve(__dirname, '../data-export/json/forum_reply.json'), 'utf8'));

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Postgres@2026',
  database: 'kilk',
  max: 2,
});

for (const r of replies) {
  await pool.query('UPDATE forum_reply SET create_time = $1 WHERE id = $2', [r.reply_time, r.id]);
  console.log(`评论 id=${r.id} create_time 已回填: ${r.reply_time}`);
}

// 验证
const { rows } = await pool.query('SELECT id, post_id, content, create_time FROM forum_reply ORDER BY id');
console.log('\n当前评论数据:');
for (const r of rows) {
  console.log(`  #${r.id} post=${r.post_id} "${r.content}" @ ${r.create_time}`);
}

await pool.end();
