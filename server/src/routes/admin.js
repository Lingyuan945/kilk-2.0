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
    const { search } = req.query;
    let sql = 'SELECT id, user_no, username, name, avatar, role, create_time FROM "user"';
    const params = [];
    if (search && String(search).trim()) {
      const kw = `%${String(search).trim()}%`;
      sql += ' WHERE username ILIKE $1 OR name ILIKE $1 OR user_no ILIKE $1';
      params.push(kw);
    }
    sql += ' ORDER BY id ASC';
    const { rows } = await db.query(sql, params);
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

// ========== 开发者管理（仅 super） ==========

// GET /api/admin/developers - 开发者列表（完整字段）
router.get('/developers', async (req, res) => {
  if (req.user?.role !== 'super') {
    return res.status(403).json({ ok: false, msg: '仅超级管理员可管理开发者' });
  }
  try {
    const { rows } = await db.query(
      `SELECT d.*, u.id as user_id, u.avatar, u.user_no
       FROM developers d
       LEFT JOIN "user" u ON d.username = u.username
       ORDER BY d.sort ASC, d.id ASC`
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('[Admin] 开发者列表错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// POST /api/admin/developers - 添加开发者（从用户中选择）
router.post('/developers', async (req, res) => {
  if (req.user?.role !== 'super') {
    return res.status(403).json({ ok: false, msg: '仅超级管理员可添加开发者' });
  }
  const { user_id, username, name, role, tagline, bio, location, email, avatar_initial, sort, hero, skills, projects, timeline, socials, contacts } = req.body;

  try {
    let finalUsername = username?.trim?.();
    let finalName = name?.trim?.();
    let finalEmail = email || '';
    let finalAvatarInitial = avatar_initial || '';

    // 从用户中选择：根据 user_id 拉取用户信息
    if (user_id) {
      const { rows: userRows } = await db.query(
        'SELECT id, username, name, avatar FROM "user" WHERE id = $1 LIMIT 1', [user_id]
      );
      if (userRows.length === 0) return res.status(400).json({ ok: false, msg: '所选用户不存在' });
      const u = userRows[0];
      finalUsername = u.username;
      finalName = finalName || u.name || u.username;
      finalAvatarInitial = finalAvatarInitial || (u.name || u.username || 'D')[0];
    }

    if (!finalUsername) return res.status(400).json({ ok: false, msg: '用户名（URL标识）不能为空' });
    if (!finalName) return res.status(400).json({ ok: false, msg: '姓名不能为空' });

    // 检查 username 唯一
    const { rows: existing } = await db.query('SELECT id FROM developers WHERE username = $1', [finalUsername]);
    if (existing.length > 0) return res.status(400).json({ ok: false, msg: '该用户已是开发者' });

    // 空白模板：名片内容不预填，由开发者本人在 /developer/me 自行填写
    const result = await db.query(
      `INSERT INTO developers (username, name, role, tagline, bio, location, email, avatar_initial, sort, hero, skills, projects, timeline, socials, contacts, updated_by, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW()) RETURNING id`,
      [finalUsername, finalName, role||'', tagline||'', bio||'', location||'', finalEmail, finalAvatarInitial, sort||0, '[]', '[]', '[]', '[]', '[]', '[]', req.user.id]
    );
    res.json({ ok: true, msg: '开发者已添加', id: result.rows[0].id });
  } catch (err) {
    console.error('[Admin] 添加开发者错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// PUT /api/admin/developers/:id - 编辑开发者
router.put('/developers/:id', async (req, res) => {
  if (req.user?.role !== 'super') {
    return res.status(403).json({ ok: false, msg: '仅超级管理员可编辑开发者' });
  }
  const { id } = req.params;
  const { username, name, role, tagline, bio, location, email, avatar_initial, sort, hero, skills, projects, timeline, socials, contacts } = req.body;

  try {
    if (username !== undefined) {
      const uname = String(username).trim();
      if (!uname) return res.status(400).json({ ok: false, msg: '用户名不能为空' });
      const { rows: existing } = await db.query('SELECT id FROM developers WHERE username = $1 AND id != $2', [uname, id]);
      if (existing.length > 0) return res.status(400).json({ ok: false, msg: '该用户名已被其他开发者使用' });
    }
    // 字符串字段：undefined=不修改，''=清空；JSON 字段：undefined=不修改
    const str = (v) => (v === undefined ? undefined : String(v));
    const json = (v) => (v === undefined ? undefined : JSON.stringify(v));
    const num = (v) => (v === undefined ? undefined : Number(v));

    const fields = {
      username: str(username?.trim?.() ?? username), name: str(name), role: str(role),
      tagline: str(tagline), bio: str(bio), location: str(location), email: str(email),
      avatar_initial: str(avatar_initial), sort: num(sort), hero: json(hero),
      skills: json(skills), projects: json(projects), timeline: json(timeline),
      socials: json(socials), contacts: json(contacts),
    };
    const sets = [];
    const params = [];
    let idx = 1;
    for (const [col, val] of Object.entries(fields)) {
      if (val !== undefined) { sets.push(`${col} = $${idx++}`); params.push(val); }
    }
    if (sets.length === 0) return res.json({ ok: true, msg: '无内容变更' });
    sets.push(`updated_by = $${idx++}`, `updated_at = NOW()`);
    params.push(req.user.id, id);

    const result = await db.query(
      `UPDATE developers SET ${sets.join(', ')} WHERE id = $${idx}`,
      params
    );
    if (result.rowCount === 0) return res.status(404).json({ ok: false, msg: '开发者不存在' });
    res.json({ ok: true, msg: '开发者已更新' });
  } catch (err) {
    console.error('[Admin] 编辑开发者错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// DELETE /api/admin/developers/:id - 删除开发者
router.delete('/developers/:id', async (req, res) => {
  if (req.user?.role !== 'super') {
    return res.status(403).json({ ok: false, msg: '仅超级管理员可删除开发者' });
  }
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM developers WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ ok: false, msg: '开发者不存在' });
    res.json({ ok: true, msg: '开发者已删除' });
  } catch (err) {
    console.error('[Admin] 删除开发者错误:', err);
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
