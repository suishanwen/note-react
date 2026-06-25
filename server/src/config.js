import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 本地开发可选：根目录放 .env 即被读取；Docker 部署由 compose 直接注入环境变量，无需 .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'note',
    timezone: '+08:00'
  },
  server: {
    port: parseInt(process.env.PORT || '3001', 10)
  },
  // 首次启动自动迁移：旧库名（与新库同 host/账号/密码，仅库名不同）。设为空则关闭自动迁移
  migrateSrcDb: process.env.SRC_DB_NAME || 'sw',
  auth: {
    // 管理员密码（明文环境变量），登录后签发 JWT
    adminPassword: process.env.ADMIN_PASSWORD || 'admin',
    jwtSecret: process.env.JWT_SECRET || 'note-dev-secret-change-me',
    jwtExpiresIn: '7d',
    // 加密笔记的全局授权码，校验通过后签发解锁令牌
    unlockCode: process.env.UNLOCK_CODE || 'unlock',
    unlockExpiresIn: '7d'
  },
  // 上传目录与前端静态产物目录，默认相对 server 根
  uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '../uploads'),
  staticDir: process.env.STATIC_DIR || path.resolve(__dirname, '../public')
};

export default config;
