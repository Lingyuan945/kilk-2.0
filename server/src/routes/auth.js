import { Router } from 'express';
import db from '../db.js';
import { generateToken, authRequired } from '../middleware/auth.js';
import { verifyPassword, hashPassword, passwordNeedsUpgrade } from '../utils/password.js';

const router = Router();

// 脱敏用户信息（去掉密码）
function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

// POST /api/auth/login - 登录
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ ok: false, msg: '请输入账号和密码' });
  }

  try {
    const { rows } = await db.query(
      'SELECT * FROM "user" WHERE username = $1 LIMIT 1',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ ok: false, msg: '账号或密码错误' });
    }

    const user = rows[0];

    if (!verifyPassword(password, user.password)) {
      return res.status(401).json({ ok: false, msg: '账号或密码错误' });
    }

    // 旧 md5 密码自动升级为 bcrypt
    if (passwordNeedsUpgrade(user.password)) {
      const newHash = hashPassword(password);
      await db.query('UPDATE "user" SET password = $1 WHERE id = $2', [newHash, user.id]);
    }

    const token = generateToken(user);

    res.json({
      ok: true,
      msg: '登录成功',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('[Auth] 登录错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误，请稍后重试' });
  }
});

// POST /api/auth/register - 注册（已关闭）
router.post('/register', async (req, res) => {
  return res.status(403).json({ ok: false, msg: '注册通道已关闭，请联系管理员开通账号' });
});

// GET /api/auth/me - 当前用户信息
router.get('/me', authRequired, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM "user" WHERE id = $1 LIMIT 1',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ ok: false, msg: '用户不存在' });
    }
    res.json({ ok: true, user: sanitizeUser(rows[0]) });
  } catch (err) {
    console.error('[Auth] 获取用户信息错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

export default router;
