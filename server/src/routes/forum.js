import { Router } from 'express';
import db from '../db.js';
import { authRequired, authOptional } from '../middleware/auth.js';

const router = Router();

// GET /api/forum/channels - 频道列表
router.get('/channels', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM channel ORDER BY sort ASC, id ASC'
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('[Forum] 获取频道错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// GET /api/forum/posts - 帖子列表
router.get('/posts', authOptional, async (req, res) => {
  const { channel_id, page = 1, page_size = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(page_size);

  try {
    let where = '';
    let params = [];
    if (channel_id) {
      where = 'WHERE p.channel_id = $1';
      params.push(channel_id);
    }

    const limitParam = params.length + 1;
    const offsetParam = params.length + 2;

    const { rows: posts } = await db.query(
      `SELECT p.*, u.username, u.name as author_name, u.avatar, u.role, c.name as channel_name
       FROM forum_post p
       LEFT JOIN "user" u ON p.user_id = u.id
       LEFT JOIN channel c ON p.channel_id = c.id
       ${where}
       ORDER BY p.create_time DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, Number(page_size), offset]
    );

    // 获取每篇帖子的评论数
    const postIds = posts.map((p) => p.id);
    let replyCounts = {};
    if (postIds.length > 0) {
      const { rows: replyRows } = await db.query(
        `SELECT post_id, COUNT(*) as count FROM forum_reply WHERE post_id = ANY($1::int[]) GROUP BY post_id`,
        [postIds]
      );
      replyCounts = Object.fromEntries(replyRows.map((r) => [r.post_id, Number(r.count)]));
    }

    const data = posts.map((p) => ({
      ...p,
      reply_count: replyCounts[p.id] || 0,
    }));

    // 总数
    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) as total FROM forum_post p ${where}`,
      params
    );

    res.json({
      ok: true,
      data,
      pagination: {
        page: Number(page),
        page_size: Number(page_size),
        total: Number(countRows[0].total),
      },
    });
  } catch (err) {
    console.error('[Forum] 获取帖子列表错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// GET /api/forum/posts/:id - 帖子详情
router.get('/posts/:id', authOptional, async (req, res) => {
  const { id } = req.params;

  try {
    const { rows: posts } = await db.query(
      `SELECT p.*, u.username, u.name as author_name, u.avatar, u.role, u.signature, c.name as channel_name
       FROM forum_post p
       LEFT JOIN "user" u ON p.user_id = u.id
       LEFT JOIN channel c ON p.channel_id = c.id
       WHERE p.id = $1 LIMIT 1`,
      [id]
    );

    if (posts.length === 0) {
      return res.status(404).json({ ok: false, msg: '帖子不存在' });
    }

    const post = posts[0];

    // 增加浏览量
    await db.query('UPDATE forum_post SET view_count = view_count + 1 WHERE id = $1', [id]);
    post.view_count = String(Number(post.view_count) + 1);

    // 帖子图片
    const { rows: images } = await db.query(
      'SELECT * FROM forum_post_image WHERE post_id = $1 ORDER BY sort ASC',
      [id]
    );

    // 评论列表
    const { rows: replies } = await db.query(
      `SELECT r.*, u.username, u.name as author_name, u.avatar, u.role
       FROM forum_reply r
       LEFT JOIN "user" u ON r.user_id = u.id
       WHERE r.post_id = $1
       ORDER BY r.reply_time ASC`,
      [id]
    );

    res.json({
      ok: true,
      data: {
        ...post,
        images,
        replies,
      },
    });
  } catch (err) {
    console.error('[Forum] 获取帖子详情错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// POST /api/forum/posts - 发帖（需登录）
router.post('/posts', authRequired, async (req, res) => {
  const { title, content, channel_id } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ ok: false, msg: '请输入帖子标题' });
  }
  if (!content || !content.trim()) {
    return res.status(400).json({ ok: false, msg: '请输入帖子内容' });
  }
  if (!channel_id) {
    return res.status(400).json({ ok: false, msg: '请选择频道' });
  }

  try {
    const { rows: inserted } = await db.query(
      `INSERT INTO forum_post (user_id, title, content, channel_id, view_count, create_time)
       VALUES ($1, $2, $3, $4, 0, NOW())
       RETURNING id`,
      [req.user.id, title.trim(), content.trim(), channel_id]
    );

    res.json({
      ok: true,
      msg: '发帖成功',
      post_id: inserted[0].id,
    });
  } catch (err) {
    console.error('[Forum] 发帖错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// POST /api/forum/posts/:id/replies - 评论（需登录）
router.post('/posts/:id/replies', authRequired, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ ok: false, msg: '请输入评论内容' });
  }

  try {
    // 检查帖子是否存在
    const { rows: posts } = await db.query('SELECT id FROM forum_post WHERE id = $1', [id]);
    if (posts.length === 0) {
      return res.status(404).json({ ok: false, msg: '帖子不存在' });
    }

    await db.query(
      `INSERT INTO forum_reply (post_id, user_id, content, reply_time)
       VALUES ($1, $2, $3, NOW())`,
      [id, req.user.id, content.trim()]
    );

    res.json({ ok: true, msg: '评论成功' });
  } catch (err) {
    console.error('[Forum] 评论错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

export default router;
