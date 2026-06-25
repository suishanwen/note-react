import jwt from 'jsonwebtoken';
import config from '../config.js';

// 校验 Authorization: Bearer <jwt>，失败返回 401
export function auth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    return res.status(401).json({ message: '未授权，请先登录' });
  }
  try {
    req.user = jwt.verify(token, config.auth.jwtSecret);
    next();
  } catch {
    return res.status(401).json({ message: '登录已过期，请重新登录' });
  }
}
