import pg from 'pg';
const pool = new pg.Pool({host:'localhost',port:5432,user:'postgres',password:'Postgres@2026',database:'kilk',max:2});
const r = await pool.query("DELETE FROM forum_post WHERE id = 17");
console.log('已删除测试帖 id=17:', r.rowCount, '条');
const r2 = await pool.query('SELECT COUNT(*) c FROM forum_post');
console.log('剩余帖子:', r2.rows[0].c);
await pool.end();
