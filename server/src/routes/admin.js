import { Router } from 'express';
import db from '../db.js';
import { authRequired, adminRequired } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const router = Router();

// 所有管理接口都需要登录和管理员权限
router.use(authRequired, adminRequired);

// ========== 服务文件上传 ==========
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVICE_UPLOAD_DIR = path.resolve(__dirname, '../../public/upload/service');
if (!fs.existsSync(SERVICE_UPLOAD_DIR)) fs.mkdirSync(SERVICE_UPLOAD_DIR, { recursive: true });

const serviceStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, SERVICE_UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').slice(0, 12) || '';
    cb(null, `service_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const serviceUpload = multer({
  storage: serviceStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

// ========== 用户管理 ==========

// GET /api/admin/users - 用户列表
router.get('/users', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, user_no, username, name, avatar, role, create_time FROM "user" ORDER BY id ASC'
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('[Admin] 获取用户列表错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// PUT /api/admin/users/:id - 更新用户角色
router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !['user', 'senior', 'admin', 'super'].includes(role)) {
    return res.status(400).json({ ok: false, msg: '无效的角色' });
  }

  // 不允许修改自己的角色（防止把自己降权后锁在管理后台外）
  if (Number(id) === req.user?.id) {
    return res.status(400).json({ ok: false, msg: '不能修改自己的账号等级' });
  }

  // 超级管理员只能有一个：不允许将其他用户提升为超级管理员
  if (role === 'super') {
    const { rows: superUsers } = await db.query('SELECT id FROM "user" WHERE role = $1', ['super']);
    if (superUsers.length > 0) {
      return res.status(400).json({ ok: false, msg: '超级管理员只能有一个，无法提升该用户' });
    }
  }

  // 不允许将现有超级管理员降级（防止失去超级管理员权限）
  const { rows: targetUser } = await db.query('SELECT role FROM "user" WHERE id = $1', [id]);
  if (targetUser.length > 0 && targetUser[0].role === 'super' && role !== 'super') {
    return res.status(400).json({ ok: false, msg: '不能降级超级管理员账号' });
  }

  try {
    await db.query('UPDATE "user" SET role = $1 WHERE id = $2', [role, id]);
    res.json({ ok: true, msg: '更新成功' });
  } catch (err) {
    console.error('[Admin] 更新用户错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// DELETE /api/admin/users/:id - 删除用户
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  // 不允许删除自己
  if (Number(id) === req.user?.id) {
    return res.status(400).json({ ok: false, msg: '不能删除自己' });
  }

  try {
    // 先删除用户的帖子和评论
    await db.query('DELETE FROM forum_reply WHERE user_id = $1', [id]);
    await db.query('DELETE FROM forum_post WHERE user_id = $1', [id]);
    await db.query('DELETE FROM "user" WHERE id = $1', [id]);
    res.json({ ok: true, msg: '删除成功' });
  } catch (err) {
    console.error('[Admin] 删除用户错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// POST /api/admin/users - 新增用户
router.post('/users', async (req, res) => {
  const { username, password, name, department, job_number, remark, role } = req.body;

  if (!username || !username.trim()) return res.status(400).json({ ok: false, msg: '登录账号不能为空' });
  if (!password || password.length < 6) return res.status(400).json({ ok: false, msg: '密码至少6位' });

  const targetRole = ['user', 'senior', 'admin'].includes(role) ? role : 'user';

  try {
    // 检查账号唯一性
    const { rows: existing } = await db.query('SELECT id FROM "user" WHERE username = $1', [username.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ ok: false, msg: '该登录账号已被使用' });
    }

    // 自动分配 8 位账号ID
    const { rows: noRows } = await db.query(
      `SELECT LPAD(CAST(COALESCE(MAX(CAST(user_no AS INTEGER)), 10000000) + 1 AS TEXT), 8, '0') AS next_no FROM "user"`
    );
    const user_no = noRows[0]?.next_no || '00000001';

    const hashedPassword = await bcrypt.hash(password, 10);

    const { rows } = await db.query(
      `INSERT INTO "user" (user_no, username, password, name, department, job_number, role, remark, create_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id`,
      [user_no, username.trim(), hashedPassword, name || '', department || '', job_number || '', targetRole, remark || '']
    );

    res.json({ ok: true, data: { id: rows[0].id, user_no }, msg: '用户已创建' });
  } catch (err) {
    console.error('[Admin] 新增用户错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// PUT /api/admin/users/:id/profile - 更新用户资料
router.put('/users/:id/profile', async (req, res) => {
  const { id } = req.params;
  const { username, name, signature, department, job_number, remark } = req.body;

  if (!username || !username.trim()) return res.status(400).json({ ok: false, msg: '登录账号不能为空' });

  try {
    // 检查账号唯一性（排除自己）
    const { rows: existing } = await db.query(
      'SELECT id FROM "user" WHERE username = $1 AND id != $2',
      [username.trim(), id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ ok: false, msg: '该登录账号已被使用' });
    }

    await db.query(
      `UPDATE "user" SET username = $1, name = $2, signature = $3, department = $4, job_number = $5, remark = $6
       WHERE id = $7`,
      [username.trim(), name || '', signature || '', department || '', job_number || '', remark || '', id]
    );

    res.json({ ok: true, msg: '用户资料已更新' });
  } catch (err) {
    console.error('[Admin] 更新用户资料错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// PUT /api/admin/users/:id/password - 重置用户密码
router.put('/users/:id/password', async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({ ok: false, msg: '密码至少6位' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query('UPDATE "user" SET password = $1 WHERE id = $2', [hashedPassword, id]);
    res.json({ ok: true, msg: '密码已重置' });
  } catch (err) {
    console.error('[Admin] 重置密码错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// ========== 帖子管理 ==========

// GET /api/admin/posts - 帖子列表
router.get('/posts', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, u.username, u.name as author_name, c.name as channel_name
       FROM forum_post p
       LEFT JOIN "user" u ON p.user_id = u.id
       LEFT JOIN channel c ON p.channel_id = c.id
       ORDER BY p.create_time DESC`
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('[Admin] 获取帖子列表错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// PUT /api/admin/posts/:id - 编辑帖子
router.put('/posts/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content, channel_id } = req.body;

  if (!title || !title.trim()) return res.status(400).json({ ok: false, msg: '标题不能为空' });
  if (!content || !content.trim()) return res.status(400).json({ ok: false, msg: '内容不能为空' });

  try {
    await db.query(
      `UPDATE forum_post SET title = $1, content = $2, channel_id = $3 WHERE id = $4`,
      [title.trim(), content.trim(), channel_id ? Number(channel_id) : null, id]
    );
    res.json({ ok: true, msg: '帖子已更新' });
  } catch (err) {
    console.error('[Admin] 编辑帖子错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// GET /api/admin/posts/:id/replies - 获取指定帖子的评论列表
router.get('/posts/:id/replies', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query(
      `SELECT r.*, u.username, u.name as author_name, u.avatar
       FROM forum_reply r
       LEFT JOIN "user" u ON r.user_id = u.id
       WHERE r.post_id = $1
       ORDER BY r.create_time ASC`,
      [id]
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('[Admin] 获取帖子评论错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// DELETE /api/admin/posts/:id - 删除帖子
router.delete('/posts/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // 先删除帖子的评论和图片
    await db.query('DELETE FROM forum_reply WHERE post_id = $1', [id]);
    await db.query('DELETE FROM forum_post_image WHERE post_id = $1', [id]);
    await db.query('DELETE FROM forum_post WHERE id = $1', [id]);
    res.json({ ok: true, msg: '删除成功' });
  } catch (err) {
    console.error('[Admin] 删除帖子错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// ========== 评论管理 ==========

// GET /api/admin/replies - 评论列表
router.get('/replies', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.*, u.username, u.name as author_name, p.title as post_title
       FROM forum_reply r
       LEFT JOIN "user" u ON r.user_id = u.id
       LEFT JOIN forum_post p ON r.post_id = p.id
       ORDER BY r.create_time DESC
       LIMIT 100`
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('[Admin] 获取评论列表错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// DELETE /api/admin/replies/:id - 删除评论
router.delete('/replies/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM forum_reply WHERE id = $1', [id]);
    res.json({ ok: true, msg: '删除成功' });
  } catch (err) {
    console.error('[Admin] 删除评论错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// ========== 频道管理 ==========

// GET /api/admin/channels - 频道列表（带版主信息）
router.get('/channels', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*, u.username as moderator_name, u.name as moderator_realname
       FROM channel c
       LEFT JOIN "user" u ON c.moderator_id = u.id
       ORDER BY c.sort ASC, c.id ASC`
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('[Admin] 获取频道列表错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// POST /api/admin/channels - 新增频道
router.post('/channels', async (req, res) => {
  const { name, description, moderator_id, sort } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ ok: false, msg: '频道名称不能为空' });

  try {
    const { rows } = await db.query(
      `INSERT INTO channel (name, description, moderator_id, sort, create_time)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [name.trim(), description || '', moderator_id ? Number(moderator_id) : null, sort ? Number(sort) : 0]
    );
    res.json({ ok: true, data: { id: rows[0].id }, msg: '频道已创建' });
  } catch (err) {
    console.error('[Admin] 新增频道错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// PUT /api/admin/channels/:id - 编辑频道
router.put('/channels/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, moderator_id, sort } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ ok: false, msg: '频道名称不能为空' });

  try {
    await db.query(
      `UPDATE channel SET name = $1, description = $2, moderator_id = $3, sort = $4 WHERE id = $5`,
      [name.trim(), description || '', moderator_id ? Number(moderator_id) : null, sort ? Number(sort) : 0, id]
    );
    res.json({ ok: true, msg: '频道已更新' });
  } catch (err) {
    console.error('[Admin] 编辑频道错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// DELETE /api/admin/channels/:id - 删除频道（帖子变为未分类）
router.delete('/channels/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // 将该频道下的帖子 channel_id 置为 NULL（未分类）
    await db.query('UPDATE forum_post SET channel_id = NULL WHERE channel_id = $1', [id]);
    await db.query('DELETE FROM channel WHERE id = $1', [id]);
    res.json({ ok: true, msg: '频道已删除，该频道下的帖子已变为未分类' });
  } catch (err) {
    console.error('[Admin] 删除频道错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// ========== "关于 Ling" 内容管理（仅超级管理员） ==========

// PUT /api/admin/ling-profile - 更新"关于 Ling"页面内容
// 说明：adminRequired 已保证 admin/super；此处再限定仅 super 角色可改
router.put('/ling-profile', async (req, res) => {
  if (req.user?.role !== 'super') {
    return res.status(403).json({ ok: false, msg: '仅超级管理员可修改此内容' });
  }

  const {
    name,
    role,
    tagline,
    bio,
    location,
    email,
    avatar_initial,
    hero,
    skills,
    projects,
    timeline,
    socials,
    contacts,
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ ok: false, msg: '姓名不能为空' });
  }

  try {
    const result = await db.query(
      `UPDATE ling_profile SET
         name = $1, role = $2, tagline = $3, bio = $4, location = $5, email = $6,
         avatar_initial = $7, hero = $8, skills = $9, projects = $10,
         timeline = $11, socials = $12, contacts = $13,
         updated_by = $14, updated_at = NOW()
       WHERE id = (SELECT MIN(id) FROM ling_profile)`,
      [
        name.trim(),
        role || '',
        tagline || '',
        bio || '',
        location || '',
        email || '',
        avatar_initial || '',
        JSON.stringify(hero || []),
        JSON.stringify(skills || []),
        JSON.stringify(projects || []),
        JSON.stringify(timeline || []),
        JSON.stringify(socials || []),
        JSON.stringify(contacts || []),
        req.user.id,
      ]
    );

    if ((result.affectedRows ?? 0) === 0) {
      return res.status(404).json({ ok: false, msg: '内容不存在，请先访问关于 Ling 页面初始化' });
    }

    res.json({ ok: true, msg: '关于 Ling 内容已更新' });
  } catch (err) {
    console.error('[Admin] 更新关于 Ling 内容错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// ========== 服务支持管理 ==========

// GET /api/admin/services - 服务文件列表
router.get('/services', async (req, res) => {
  try {
    const { rows: files } = await db.query(
      `SELECT f.*, u.username, u.name as author_name
       FROM service_file f
       LEFT JOIN "user" u ON f.user_id = u.id
       ORDER BY f.create_time DESC`
    );

    // 获取每个文件的版本列表
    const fileIds = files.map((f) => f.id);
    let itemsMap = {};
    if (fileIds.length > 0) {
      const { rows: items } = await db.query(
        `SELECT * FROM service_file_item WHERE service_id = ANY($1::int[]) ORDER BY create_time DESC`,
        [fileIds]
      );
      itemsMap = items.reduce((acc, item) => {
        if (!acc[item.service_id]) acc[item.service_id] = [];
        acc[item.service_id].push(item);
        return acc;
      }, {});
    }

    const data = files.map((f) => ({
      ...f,
      versions: itemsMap[f.id] || [],
      total_downloads: (itemsMap[f.id] || []).reduce((sum, v) => sum + Number(v.download_count || 0), 0),
    }));

    res.json({ ok: true, data });
  } catch (err) {
    console.error('[Admin] 获取服务文件列表错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// POST /api/admin/services - 新增服务文件
router.post('/services', async (req, res) => {
  const { title, description, file_path, file_name, file_size } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ ok: false, msg: '标题不能为空' });
  }

  try {
    const result = await db.query(
      `INSERT INTO service_file (user_id, title, description, file_path, file_name, file_size, create_time)
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id`,
      [req.user.id, title.trim(), description || '', file_path || '', file_name || '', file_size || 0]
    );

    const newId = result.rows[0].id;

    // 如果有文件路径，同时创建一个版本记录
    if (file_path) {
      await db.query(
        `INSERT INTO service_file_item (service_id, file_path, file_name, file_size, download_count, version_note, create_time)
         VALUES ($1, $2, $3, $4, 0, '初始版本', NOW())`,
        [newId, file_path, file_name || '', file_size || 0]
      );
    }

    res.json({ ok: true, msg: '服务文件已添加', id: newId });
  } catch (err) {
    console.error('[Admin] 新增服务文件错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// PUT /api/admin/services/:id - 编辑服务文件
router.put('/services/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, file_path, file_name, file_size } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ ok: false, msg: '标题不能为空' });
  }

  try {
    const result = await db.query(
      `UPDATE service_file SET title = $1, description = $2, file_path = $3, file_name = $4, file_size = $5
       WHERE id = $6`,
      [title.trim(), description || '', file_path || '', file_name || '', file_size || 0, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, msg: '服务文件不存在' });
    }

    res.json({ ok: true, msg: '服务文件已更新' });
  } catch (err) {
    console.error('[Admin] 编辑服务文件错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// POST /api/admin/services/upload - 上传服务文件到服务器
router.post('/services/upload', serviceUpload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, msg: '未接收到文件' });
  }
  const url = `/upload/service/${req.file.filename}`;
  res.json({
    ok: true,
    msg: '文件上传成功',
    data: {
      url,
      file_name: req.file.originalname,
      file_size: req.file.size,
    },
  });
});

// POST /api/admin/services/:id/versions - 为服务上传新版本文件
router.post('/services/:id/versions', serviceUpload.single('file'), async (req, res) => {
  const { id } = req.params;
  const { version_note } = req.body;

  // 校验服务存在
  const exists = await db.query('SELECT id FROM service_file WHERE id = $1', [id]);
  if (exists.rowCount === 0) {
    return res.status(404).json({ ok: false, msg: '服务文件不存在' });
  }

  if (!req.file) {
    return res.status(400).json({ ok: false, msg: '请选择要上传的文件' });
  }

  try {
    const url = `/upload/service/${req.file.filename}`;
    await db.query(
      `INSERT INTO service_file_item (service_id, file_path, file_name, file_size, download_count, version_note, create_time)
       VALUES ($1, $2, $3, $4, 0, $5, NOW())`,
      [id, url, req.file.originalname, req.file.size, version_note || '']
    );
    res.json({ ok: true, msg: '新版本已上传' });
  } catch (err) {
    console.error('[Admin] 上传版本错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// DELETE /api/admin/services/versions/:versionId - 删除服务版本
router.delete('/services/versions/:versionId', async (req, res) => {
  const { versionId } = req.params;

  try {
    const { rows } = await db.query('SELECT * FROM service_file_item WHERE id = $1', [versionId]);
    if (rows.length === 0) {
      return res.status(404).json({ ok: false, msg: '版本记录不存在' });
    }

    await db.query('DELETE FROM service_file_item WHERE id = $1', [versionId]);

    // 删除物理文件（仅删除 /upload/service/ 下的文件）
    const filePath = rows[0].file_path || '';
    if (filePath.startsWith('/upload/service/')) {
      const absPath = path.join(SERVICE_UPLOAD_DIR, path.basename(filePath));
      fs.unlink(absPath, () => {});
    }

    res.json({ ok: true, msg: '版本已删除' });
  } catch (err) {
    console.error('[Admin] 删除版本错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// DELETE /api/admin/services/:id - 删除服务文件
router.delete('/services/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // 先获取版本记录，删除物理文件
    const { rows: versions } = await db.query('SELECT file_path FROM service_file_item WHERE service_id = $1', [id]);
    versions.forEach((v) => {
      if ((v.file_path || '').startsWith('/upload/service/')) {
        const absPath = path.join(SERVICE_UPLOAD_DIR, path.basename(v.file_path));
        fs.unlink(absPath, () => {});
      }
    });

    // 再删除版本记录
    await db.query('DELETE FROM service_file_item WHERE service_id = $1', [id]);

    // 最后删除主记录
    const result = await db.query('DELETE FROM service_file WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, msg: '服务文件不存在' });
    }

    res.json({ ok: true, msg: '服务文件已删除' });
  } catch (err) {
    console.error('[Admin] 删除服务文件错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

export default router;
