import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import config from './config.js';
import { initDatabase } from './init.js';
import authRouter from './routes/auth.js';
import notesRouter from './routes/notes.js';
import uploadRouter from './routes/upload.js';
import adminRouter from './routes/admin.js';

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '10mb' }));

// API 路由
app.use('/api/auth', authRouter);
app.use('/api/notes', notesRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/admin', adminRouter);

// 上传文件静态访问
fs.mkdirSync(config.uploadDir, { recursive: true });
app.use('/uploads', express.static(config.uploadDir));

// 前端静态产物与 SPA 回退
if (fs.existsSync(config.staticDir)) {
  app.use(express.static(config.staticDir));
  app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
    res.sendFile(path.join(config.staticDir, 'index.html'));
  });
}

// 先初始化数据库（建库建表 + 首次自动迁移），再启动服务
initDatabase()
  .then(() => {
    app.listen(config.server.port, () => {
      console.log('Server#start 监听端口 %d', config.server.port);
    });
  })
  .catch((err) => {
    console.error('Server#start 数据库初始化失败 %s', err.message);
    process.exit(1);
  });
