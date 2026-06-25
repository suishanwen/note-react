import { Router } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config.js';

const router = Router();

// POST /api/auth/login — 校验管理员密码并签发 JWT
router.post('/login', (req, res) => {
  const { password } = req.body || {};
  if (!password || password !== config.auth.adminPassword) {
    console.warn('AuthRoute#login 密码校验失败');
    return res.status(401).json({ message: '密码错误' });
  }
  const token = jwt.sign({ role: 'admin' }, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn
  });
  res.json({ token });
});

// POST /api/auth/unlock — 凭管理员密码签发解锁令牌（查看加密笔记，但无管理权限）
router.post('/unlock', (req, res) => {
  const { password } = req.body || {};
  if (!password || password !== config.auth.adminPassword) {
    console.warn('AuthRoute#unlock 密码校验失败');
    return res.status(401).json({ message: '密码错误' });
  }
  const token = jwt.sign({ scope: 'unlock' }, config.auth.jwtSecret, {
    expiresIn: config.auth.unlockExpiresIn
  });
  res.json({ token });
});

export default router;
