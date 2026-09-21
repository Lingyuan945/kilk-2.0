import { Router } from 'express';
import db from '../db.js';
import { authRequired, adminRequired } from '../middleware/auth.js';

const router = Router();

// GET /api/notice - 公告列表（置顶在前，最新在前）
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, title, content, is_pinned, author_name, created_at, updated_at
       FROM notice
       ORDER BY is_pinned DESC, created_at DESC, id DESC`
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('[Notice] 获取公告列表错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// GET /api/notice/:id - 公告详情
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, title, content, is_pinned, author_name, created_at, updated_at
       FROM notice WHERE id = $1 LIMIT 1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ ok: false, msg: '公告不存在' });
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error('[Notice] 获取公告详情错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// POST /api/notice - 发布公告（管理员）
router.post('/', authRequired, adminRequired, async (req, res) => {
  try {
    const { title, content, is_pinned } = req.body;
    if (!title || !String(title).trim()) return res.status(400).json({ ok: false, msg: '公告标题必填' });
    if (!content || !String(content).trim()) return res.status(400).json({ ok: false, msg: '公告内容必填' });
    const authorName = req.user.name || req.user.username || '管理员';
    const { rows } = await db.query(
      `INSERT INTO notice (title, content, is_pinned, author_name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [String(title).trim(), String(content).trim(), is_pinned ? 1 : 0, authorName]
    );
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error('[Notice] 发布公告错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// PUT /api/notice/:id - 编辑公告（管理员）
router.put('/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const { title, content, is_pinned } = req.body;
    const { rows: cur } = await db.query('SELECT * FROM notice WHERE id = $1', [req.params.id]);
    if (cur.length === 0) return res.status(404).json({ ok: false, msg: '公告不存在' });
    const { rows } = await db.query(
      `UPDATE notice
       SET title = $1, content = $2, is_pinned = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [
        title !== undefined ? String(title).trim() : cur[0].title,
        content !== undefined ? String(content).trim() : cur[0].content,
        is_pinned !== undefined ? (is_pinned ? 1 : 0) : cur[0].is_pinned,
        req.params.id,
      ]
    );
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error('[Notice] 编辑公告错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// DELETE /api/notice/:id - 删除公告（管理员）
router.delete('/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const { rows } = await db.query('DELETE FROM notice WHERE id = $1 RETURNING id', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ ok: false, msg: '公告不存在' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[Notice] 删除公告错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

export default router;
