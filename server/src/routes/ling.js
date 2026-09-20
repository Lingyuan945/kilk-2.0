import { Router } from 'express';
import db from '../db.js';

const router = Router();

function parseJson(value) {
  if (value === null || value === undefined) return [];
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return []; }
  }
  return value;
}

// GET /api/ling - 兼容旧 API，返回第一个开发者
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM developers ORDER BY sort ASC, id ASC LIMIT 1');
    if (rows.length === 0) return res.json({ ok: true, data: null });
    const row = rows[0];
    let avatar = null;
    try {
      const { rows: userRows } = await db.query('SELECT avatar FROM "user" WHERE username = $1 LIMIT 1', [row.username]);
      if (userRows.length > 0 && userRows[0].avatar) avatar = userRows[0].avatar;
    } catch (e) { console.error('[Ling] 头像获取失败:', e.message); }
    res.json({
      ok: true,
      data: {
        id: row.id, username: row.username, name: row.name, role: row.role,
        tagline: row.tagline, bio: row.bio, location: row.location, email: row.email,
        avatar, avatar_initial: row.avatar_initial,
        hero: parseJson(row.hero), skills: parseJson(row.skills), projects: parseJson(row.projects),
        timeline: parseJson(row.timeline), socials: parseJson(row.socials), contacts: parseJson(row.contacts),
        updated_at: row.updated_at,
      },
    });
  } catch (err) {
    console.error('[Ling] 获取内容错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

export default router;
