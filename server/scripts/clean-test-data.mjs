import pg from 'pg';

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Postgres@2026',
  database: 'kilk',
  max: 2,
});

const r = await pool.query(
  `DELETE FROM forum_post WHERE title LIKE '%越权测试%' OR title LIKE '%自动测试%' RETURNING id`
);
console.log('已清理测试帖子:', r.rowCount, '条');
const r2 = await pool.query('SELECT COUNT(*) c FROM forum_post');
console.log('剩余帖子数:', r2.rows[0].c);
const r3 = await pool.query('SELECT COUNT(*) c FROM forum_reply');
console.log('剩余评论数:', r3.rows[0].c);

await pool.end();
