import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import config from '../config.js';
import { auth } from '../middleware/auth.js';

const router = Router();

// POST /api/admin/update — 触发宿主机更新（拉代码+重建+重启）
// 容器内无法操作宿主机 docker，这里只写触发标记文件，由宿主机常驻脚本监听执行
router.post('/update', auth, (req, res) => {
  const dir = config.triggerDir;
  if (!dir) {
    return res.status(501).json({ message: '未配置更新触发目录 TRIGGER_DIR' });
  }
  try {
    fs.mkdirSync(dir, { recursive: true });
    const flag = path.join(dir, 'update.trigger');
    fs.writeFileSync(flag, new Date().toISOString());
    console.log('AdminRoute#update 已写入更新触发标记 %s', flag);
    res.json({ message: '更新已触发，宿主机将在后台拉取代码并重建' });
  } catch (err) {
    console.error('AdminRoute#update 写入触发标记失败 %s', err.message);
    res.status(500).json({ message: '触发更新失败' });
  }
});

export default router;
