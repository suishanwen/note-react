import express from 'express';
import helmet from 'helmet';
import fs from 'node:fs';
import path from 'node:path';
import config from './config.js';
import { initDatabase } from './init.js';
import { errorHandler } from './middleware/error.js';
import authRouter from './routes/auth.js';
import notesRouter from './routes/notes.js';
import uploadRouter from './routes/upload.js';
import adminRouter from './routes/admin.js';

const app = express();
app.set('trust proxy', true);

// 安全响应头。关闭 CSP 与跨源资源策略：正文渲染用户内嵌 HTML、data: 图片、
// 以及沙箱 iframe 运行 live 应用，严格 CSP 会破坏这些功能
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
  })
);
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

// 全局错误处理（须在所有路由之后注册）
app.use(errorHandler);

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
