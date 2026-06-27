import { Router } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import config from '../config.js';

const router = Router();

// 登录限流：单 IP 15 分钟最多 10 次，防管理员密码暴力破解
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '尝试过于频繁，请 15 分钟后再试' }
});

// POST /api/auth/login — 校验管理员密码并签发 JWT
router.post('/login', loginLimiter, (req, res) => {
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

export default router;
