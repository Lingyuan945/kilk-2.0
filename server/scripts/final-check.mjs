import pg from 'pg';
const pool = new pg.Pool({host:'localhost',port:5432,user:'postgres',password:'Postgres@2026',database:'kilk',max:2});
const r = await pool.query("DELETE FROM forum_reply WHERE content LIKE '%本地浏览器评论验证%' RETURNING id");
console.log('已清理测试评论:', r.rows.map(x=>x.id).join(',') || 0);
const r2 = await pool.query('SELECT COUNT(*) c FROM forum_reply');
console.log('剩余评论:', r2.rows[0].c);
const r3 = await pool.query('SELECT COUNT(*) c FROM forum_post');
console.log('帖子数:', r3.rows[0].c, '| 频道数:', (await pool.query('SELECT COUNT(*) c FROM channel')).rows[0].c, '| 用户数:', (await pool.query('SELECT COUNT(*) c FROM "user"')).rows[0].c);
await pool.end();
