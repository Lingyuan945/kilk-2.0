import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { authRequired } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 头像上传目录：本地开发时直接写入前端 public/upload，方便 Vite 静态服务
const UPLOAD_DIR = path.resolve(__dirname, '../../public/upload');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const extMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };
    const ext = extMap[file.mimetype] || 'jpg';
    cb(null, `avatar_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('仅支持 jpg/png/gif/webp 格式'));
  },
});

const router = Router();

// 脱敏用户信息
function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

// GET /api/users/:id - 用户公开信息
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await db.query(
      'SELECT id, user_no, username, name, avatar, signature, department, job_number, role, create_time FROM "user" WHERE id = $1 LIMIT 1',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, msg: '用户不存在' });
    }

    // 用户的帖子数
    const { rows: postRows } = await db.query(
      'SELECT COUNT(*) as count FROM forum_post WHERE user_id = $1',
      [id]
    );

    res.json({
      ok: true,
      data: {
        ...rows[0],
        post_count: Number(postRows[0].count),
      },
    });
  } catch (err) {
    console.error('[User] 获取用户信息错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// GET /api/users/:id/posts - 用户的帖子列表
router.get('/:id/posts', async (req, res) => {
  const { id } = req.params;
  const { page = 1, page_size = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(page_size);

  try {
    const { rows: posts } = await db.query(
      `SELECT p.*, c.name as channel_name
       FROM forum_post p
       LEFT JOIN channel c ON p.channel_id = c.id
       WHERE p.user_id = $1
       ORDER BY p.create_time DESC
       LIMIT $2 OFFSET $3`,
      [id, Number(page_size), offset]
    );

    res.json({ ok: true, data: posts });
  } catch (err) {
    console.error('[User] 获取用户帖子错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// PUT /api/users/profile - 更新当前用户资料（签名、部门、工号）
router.put('/profile', authRequired, async (req, res) => {
  const userId = req.user?.id;
  const { signature, department, job_number } = req.body;

  try {
    // 只有 admin/super 可以修改部门和工号
    const { rows: userRows } = await db.query('SELECT role FROM "user" WHERE id = $1', [userId]);
    if (userRows.length === 0) return res.status(404).json({ ok: false, msg: '用户不存在' });

    const role = userRows[0].role;
    const canEditDept = ['admin', 'super'].includes(role);

    const fields = ['signature = $1'];
    const values = [signature || ''];
    if (canEditDept) {
      fields.push('department = $2', 'job_number = $3');
      values.push(department || '', job_number || '');
    }
    values.push(userId);

    await db.query(`UPDATE "user" SET ${fields.join(', ')} WHERE id = $${values.length}`, values);

    const { rows } = await db.query(
      'SELECT id, user_no, username, name, avatar, signature, department, job_number, role, create_time FROM "user" WHERE id = $1',
      [userId]
    );
    res.json({ ok: true, data: sanitizeUser(rows[0]), msg: '资料已保存' });
  } catch (err) {
    console.error('[User] 更新资料错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// POST /api/users/avatar - 上传头像
router.post('/avatar', authRequired, upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, msg: '请选择头像文件' });

  const userId = req.user?.id;
  const avatarUrl = `/upload/${req.file.filename}`;

  try {
    // 删除旧头像文件
    const { rows } = await db.query('SELECT avatar FROM "user" WHERE id = $1', [userId]);
    if (rows[0]?.avatar && rows[0].avatar.startsWith('/upload/')) {
      const oldPath = path.join(UPLOAD_DIR, path.basename(rows[0].avatar));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await db.query('UPDATE "user" SET avatar = $1 WHERE id = $2', [avatarUrl, userId]);
    res.json({ ok: true, data: { avatar: avatarUrl }, msg: '头像已更新' });
  } catch (err) {
    console.error('[User] 上传头像错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// PUT /api/users/password - 修改密码
router.put('/password', authRequired, async (req, res) => {
  const userId = req.user?.id;
  const { old_password, new_password, confirm_password } = req.body;

  if (!old_password || !new_password || !confirm_password) {
    return res.status(400).json({ ok: false, msg: '请填写完整信息' });
  }
  if (new_password.length < 6) return res.status(400).json({ ok: false, msg: '新密码长度至少6位' });
  if (new_password !== confirm_password) return res.status(400).json({ ok: false, msg: '两次输入的新密码不一致' });

  try {
    const { rows } = await db.query('SELECT password FROM "user" WHERE id = $1', [userId]);
    if (rows.length === 0) return res.status(404).json({ ok: false, msg: '用户不存在' });

    const valid = await bcrypt.compare(old_password, rows[0].password);
    if (!valid) return res.status(400).json({ ok: false, msg: '原密码不正确' });

    const hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE "user" SET password = $1 WHERE id = $2', [hash, userId]);
    res.json({ ok: true, msg: '密码已修改，下次登录请使用新密码' });
  } catch (err) {
    console.error('[User] 修改密码错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

export default router;
