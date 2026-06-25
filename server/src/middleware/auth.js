import jwt from 'jsonwebtoken';
import config from '../config.js';

// 解析 Authorization: Bearer <jwt>，返回解码后的 payload，失败返回 null
function verifyBearer(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  try {
    return jwt.verify(token, config.auth.jwtSecret);
  } catch {
    return null;
  }
}

// 强制管理员登录，失败返回 401
export function auth(req, res, next) {
  const payload = verifyBearer(req);
  if (!payload || payload.role !== 'admin') {
    return res.status(401).json({ message: '未授权，请先登录' });
  }
  req.user = payload;
  next();
}

// 标记是否有权查看加密笔记：管理员 JWT 或有效解锁令牌（X-Unlock-Token），不拦截请求
export function canViewEncrypted(req, res, next) {
  const payload = verifyBearer(req);
  req.isAdmin = payload?.role === 'admin';
  req.canViewEncrypted = req.isAdmin;
  if (!req.canViewEncrypted) {
    const unlock = req.headers['x-unlock-token'];
    if (unlock) {
      try {
        jwt.verify(unlock, config.auth.jwtSecret);
        req.canViewEncrypted = true;
      } catch {
        // 解锁令牌无效，保持不可见
      }
    }
  }
  next();
}
