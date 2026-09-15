import jwt from 'jsonwebtoken';
import { config } from '../config.js';

// 生成 JWT token
export function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

// 认证中间件：验证 token，将用户信息挂载到 req.user
export function authRequired(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ ok: false, msg: '未登录，请先登录' });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, msg: '登录已过期，请重新登录' });
  }
}

// 可选认证：有 token 就解析，没有也继续
export function authOptional(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    try {
      req.user = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      // token 无效也继续，当作未登录
    }
  }
  next();
}

// 管理员权限检查
export function adminRequired(req, res, next) {
  if (!req.user || !['admin', 'super'].includes(req.user.role)) {
    return res.status(403).json({ ok: false, msg: '权限不足' });
  }
  next();
}
