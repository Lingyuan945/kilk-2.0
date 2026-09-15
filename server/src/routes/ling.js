import { Router } from 'express';
import db from '../db.js';

const router = Router();

// PGlite 的 jsonb 列可能返回字符串，统一解析为对象
function parseJson(value) {
  if (value === null || value === undefined) return [];
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return value;
}

// GET /api/ling - 公开获取"关于 Ling"页面内容
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM ling_profile ORDER BY id ASC LIMIT 1');
    if (rows.length === 0) {
      return res.json({ ok: true, data: null });
    }
    const row = rows[0];

    // 从 user 表获取 ling 账号（id=1）的头像，随账号更改
    let avatar = null;
    try {
      const { rows: userRows } = await db.query('SELECT avatar FROM "user" WHERE id = 1 LIMIT 1');
      if (userRows.length > 0 && userRows[0].avatar) {
        avatar = userRows[0].avatar;
      }
    } catch (e) {
      console.error('[Ling] 获取用户头像失败:', e.message);
    }

    res.json({
      ok: true,
      data: {
        id: row.id,
        name: row.name,
        role: row.role,
        tagline: row.tagline,
        bio: row.bio,
        location: row.location,
        email: row.email,
        avatar: avatar,
        avatar_initial: row.avatar_initial,
        hero: parseJson(row.hero),
        skills: parseJson(row.skills),
        projects: parseJson(row.projects),
        timeline: parseJson(row.timeline),
        socials: parseJson(row.socials),
        contacts: parseJson(row.contacts),
        updated_at: row.updated_at,
      },
    });
  } catch (err) {
    console.error('[Ling] 获取内容错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

export default router;
