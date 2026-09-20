import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// 验证密码：兼容 PHP bcrypt($2y$) 和旧 32 位 md5
export function verifyPassword(password, hash) {
  // bcrypt（PHP 的 $2y$ 与 Node 的 $2a$ 兼容）
  if (hash.startsWith('$2y$') || hash.startsWith('$2a$')) {
    const normalizedHash = hash.startsWith('$2y$') ? '$2a$' + hash.slice(4) : hash;
    return bcrypt.compareSync(password, normalizedHash);
  }
  // 旧 md5（32位十六进制）
  if (hash.length === 32 && /^[0-9a-fA-F]+$/.test(hash)) {
    return crypto.createHash('md5').update(password).digest('hex') === hash;
  }
  return false;
}

// 哈希密码（bcrypt）
export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

// 检查密码是否需要升级（非 bcrypt）
export function passwordNeedsUpgrade(hash) {
  return !hash.startsWith('$2y$') && !hash.startsWith('$2a$');
}
