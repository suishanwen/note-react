import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import config from '../config.js';
import { auth } from '../middleware/auth.js';

const router = Router();

fs.mkdirSync(config.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomBytes(16).toString('hex') + ext;
    cb(null, name);
  }
});

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']);

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) return cb(null, true);
    cb(new Error('仅支持图片格式'));
  }
});

// POST /api/upload — 上传单张图片，返回可访问 URL
router.post('/', auth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.warn('UploadRoute#upload 上传失败 %s', err.message);
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) return res.status(400).json({ message: '未接收到文件' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

export default router;
