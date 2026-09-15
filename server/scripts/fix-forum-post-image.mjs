// 补充 forum_post_image 表（原 MySQL 11 张表中漏建的一张）
import pg from 'pg';

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Postgres@2026',
  database: 'kilk',
  max: 2,
});

const { rows } = await pool.query(
  "SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema='public' AND table_name='forum_post_image'"
);
if (Number(rows[0].c) > 0) {
  console.log('forum_post_image 表已存在，检查数据...');
  const r = await pool.query('SELECT COUNT(*) AS c FROM forum_post_image');
  console.log('现有数据:', r.rows[0].c, '条');
} else {
  await pool.query(`
    CREATE TABLE forum_post_image (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL,
      image_path VARCHAR(255) NOT NULL,
      sort INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX idx_forum_post_image_post ON forum_post_image (post_id);
  `);
  console.log('forum_post_image 表创建成功');
  // 导入原数据（1条）
  await pool.query(
    `INSERT INTO forum_post_image (id, post_id, image_path, sort) VALUES ($1, $2, $3, $4)`,
    [5, 4, '/upload/20260902095605_6a978235a46aa.jpg', 0]
  );
  console.log('原图片数据已导入 (id=5, post_id=4)');
}

await pool.end();
