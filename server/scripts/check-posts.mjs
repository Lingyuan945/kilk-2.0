import pg from 'pg';
const pool = new pg.Pool({host:'localhost',port:5432,user:'postgres',password:'Postgres@2026',database:'kilk',max:2});
const r = await pool.query("SELECT id, title FROM forum_post ORDER BY id");
console.log('帖子:', r.rows.map(x => x.id + ':' + x.title).join(' | '));
await pool.end();
