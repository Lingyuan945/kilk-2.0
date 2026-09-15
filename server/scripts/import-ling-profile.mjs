// 导入 ling_profile 数据（简历风格）
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(readFileSync(path.resolve(__dirname, '../data-export/ling-seed.json'), 'utf8'));

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Postgres@2026',
  database: 'kilk',
  max: 2,
});

const { rows } = await pool.query('SELECT COUNT(*) AS c FROM ling_profile');
if (Number(rows[0].c) > 0) {
  console.log('ling_profile 已有数据，跳过');
} else {
  const r = await pool.query(
    `INSERT INTO ling_profile (name, role, tagline, bio, location, email, avatar_initial, hero, skills, projects, timeline, socials, contacts, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, NOW())
     RETURNING id`,
    [
      seed.name, seed.role, seed.tagline, seed.bio, seed.location, seed.email, seed.avatar_initial,
      JSON.stringify(seed.hero || []),
      JSON.stringify(seed.skills || []),
      JSON.stringify(seed.projects || []),
      JSON.stringify(seed.timeline || []),
      JSON.stringify(seed.socials || []),
      JSON.stringify(seed.contacts || []),
    ]
  );
  console.log('ling_profile 导入成功, id=' + r.rows[0].id);
}

await pool.end();
