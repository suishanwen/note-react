const express = require('express');
const router = express.Router();
const db = require('../db');
const { adminToken } = require('../config');

// token 认证中间件
const auth = (req, res, next) => {
  const token = req.headers['x-auth-token'] || req.headers['authorization'];
  if (token !== adminToken) {
    return res.status(401).json({ message: '未授权，请先登录' });
  }
  next();
};

// GET /api/note — 获取所有 note 列表
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, parent, title, tag, summary, poster, ip, post_time AS postTime, edit_time AS editTime, recommend FROM note ORDER BY post_time DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/note/get?id={id} — 获取单条 note
router.get('/get', async (req, res) => {
  const { id } = req.query;
  try {
    const [rows] = await db.query(
      'SELECT id, parent, title, content, tag, summary, poster, ip, post_time AS postTime, edit_time AS editTime, recommend FROM note WHERE id = ?',
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Note not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/note/add — 新增 note
router.post('/add', auth, async (req, res) => {
  const { parent, title, content, poster, ip, tag, summary, recommend } = req.body;
  const now = new Date();
  try {
    const [result] = await db.query(
      'INSERT INTO note (parent, title, content, poster, ip, tag, summary, recommend, post_time, edit_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [parent ?? -1, title, content, poster, ip ?? null, tag, summary, recommend ?? 0, now, now]
    );
    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/note/edit — 编辑 note
router.post('/edit', auth, async (req, res) => {
  const { id, title, content, poster, tag, summary, recommend } = req.body;
  const now = new Date();
  try {
    await db.query(
      'UPDATE note SET title=?, content=?, poster=?, tag=?, summary=?, recommend=?, edit_time=? WHERE id=?',
      [title, content, poster, tag, summary, recommend ?? 0, now, id]
    );
    res.json({ id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/note/delete/:id — 删除 note（需要 token 认证）
router.post('/delete/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM note WHERE id=?', [id]);
    res.json({ id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
