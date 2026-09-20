import { Router } from 'express';
import db from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

function parseJson(value) {
  if (value === null || value === undefined) return [];
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return []; }
  }
  return value;
}

function formatDeveloper(row, avatar) {
  return {
    id: row.id, username: row.username, name: row.name, role: row.role,
    tagline: row.tagline, bio: row.bio, location: row.location, email: row.email,
    avatar: avatar || null, avatar_initial: row.avatar_initial,
    hero: parseJson(row.hero), skills: parseJson(row.skills), projects: parseJson(row.projects),
    timeline: parseJson(row.timeline), socials: parseJson(row.socials), contacts: parseJson(row.contacts),
    sort: row.sort, updated_at: row.updated_at,
  };
}

// GET /api/developers - 开发者列表
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT d.id, d.username, d.name, d.role, d.tagline, d.avatar_initial, d.sort,
              u.avatar, u.id as user_id
       FROM developers d
       LEFT JOIN "user" u ON d.username = u.username
       ORDER BY d.sort ASC, d.id ASC`
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('[Developers] 列表错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// GET /api/developers/me - 当前登录用户自己的开发者名片
router.get('/me', authRequired, async (req, res) => {
  try {
    const username = req.user?.username;
    if (!username) return res.status(401).json({ ok: false, msg: '未登录' });
    const { rows } = await db.query(
      `SELECT d.*, u.avatar
       FROM developers d
       LEFT JOIN "user" u ON d.username = u.username
       WHERE d.username = $1 LIMIT 1`, [username]
    );
    if (rows.length === 0) return res.json({ ok: true, data: null, msg: '当前用户还不是开发者' });
    res.json({ ok: true, data: formatDeveloper(rows[0], rows[0].avatar) });
  } catch (err) {
    console.error('[Developers] 我的名片查询错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// PUT /api/developers/me - 更新自己的开发者名片（仅限自身名片字段，username/name/role/sort 由超管管理）
router.put('/me', authRequired, async (req, res) => {
  try {
    const username = req.user?.username;
    if (!username) return res.status(401).json({ ok: false, msg: '未登录' });
    const { rows: existing } = await db.query('SELECT id FROM developers WHERE username = $1 LIMIT 1', [username]);
    if (existing.length === 0) return res.status(404).json({ ok: false, msg: '当前用户还不是开发者' });

    const { tagline, bio, location, email, avatar_initial, hero, skills, projects, timeline, socials, contacts } = req.body;
    // 动态 SET：undefined=不修改，''=清空字符串，[]=清空 JSON
    const str = (v) => (v === undefined ? undefined : String(v));
    const json = (v) => (v === undefined ? undefined : JSON.stringify(v));
    const fields = {
      tagline: str(tagline), bio: str(bio), location: str(location), email: str(email),
      avatar_initial: str(avatar_initial), hero: json(hero), skills: json(skills),
      projects: json(projects), timeline: json(timeline), socials: json(socials), contacts: json(contacts),
    };
    const sets = [];
    const params = [];
    let idx = 1;
    for (const [col, val] of Object.entries(fields)) {
      if (val !== undefined) { sets.push(`${col} = $${idx++}`); params.push(val); }
    }
    if (sets.length === 0) return res.json({ ok: true, msg: '无内容变更' });
    sets.push(`updated_by = $${idx++}`, `updated_at = NOW()`);
    params.push(req.user.id, username);

    const result = await db.query(
      `UPDATE developers SET ${sets.join(', ')} WHERE username = $${idx}`,
      params
    );
    if (result.rowCount === 0) return res.status(404).json({ ok: false, msg: '开发者不存在' });
    res.json({ ok: true, msg: '名片已更新' });
  } catch (err) {
    console.error('[Developers] 我的名片更新错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// GET /api/developers/:username - 开发者详情
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { rows } = await db.query('SELECT * FROM developers WHERE username = $1 LIMIT 1', [username]);
    if (rows.length === 0) return res.status(404).json({ ok: false, msg: '开发者不存在' });
    const row = rows[0];
    let avatar = null;
    try {
      const { rows: userRows } = await db.query('SELECT avatar FROM "user" WHERE username = $1 LIMIT 1', [username]);
      if (userRows.length > 0 && userRows[0].avatar) avatar = userRows[0].avatar;
    } catch (e) { console.error('[Developer] 头像获取失败:', e.message); }
    res.json({ ok: true, data: formatDeveloper(row, avatar) });
  } catch (err) {
    console.error('[Developer] 详情错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

export default router;
