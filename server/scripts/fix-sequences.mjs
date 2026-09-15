// 重置所有 SERIAL 序列，解决导入后自增主键冲突
import pg from 'pg';

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Postgres@2026',
  database: 'kilk',
  max: 2,
});

// 所有含 SERIAL id 的表
const tables = ['user', 'channel', 'forum_post', 'forum_reply', 'forum_post_image', 'service_file', 'service_file_item', 'home_content', 'ling_profile'];

for (const t of tables) {
  // 检查表是否存在
  const check = await pool.query(
    "SELECT to_regclass('public." + t + "') AS t"
  );
  if (!check.rows[0].t) { console.log(`[跳过] ${t}: 表不存在`); continue; }

  const seqSql = await pool.query(
    "SELECT pg_get_serial_sequence('" + t + "', 'id') AS seq"
  );
  if (!seqSql.rows[0].seq) { console.log(`[跳过] ${t}: 无序列`); continue; }

  await pool.query(
    `SELECT setval('${seqSql.rows[0].seq}', COALESCE((SELECT MAX(id) FROM "${t}"), 0) + 1, false)`
  );
  const r = await pool.query(`SELECT MAX(id) AS max_id FROM "${t}"`);
  console.log(`✅ ${t}: 序列已重置 (max_id=${r.rows[0].max_id ?? 0})`);
}

await pool.end();
console.log('\n所有序列重置完成');
