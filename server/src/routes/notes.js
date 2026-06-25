import { Router } from 'express';
import pool from '../db.js';
import { auth } from '../middleware/auth.js';

const router = Router();

// 列表字段不含 content，减小传输体积
const LIST_FIELDS =
  'id, parent, title, tag, summary, poster, recommend, post_time AS postTime, edit_time AS editTime';
const DETAIL_FIELDS =
  'id, parent, title, content, tag, summary, poster, ip, recommend, post_time AS postTime, edit_time AS editTime';

// 取真实客户端 IP
function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.socket.remoteAddress || null;
}

// GET /api/notes?keyword=&tag= — 列表，支持标题/摘要关键字与标签筛选
router.get('/', async (req, res) => {
  const { keyword, tag } = req.query;
  const where = [];
  const params = [];
  if (keyword) {
    where.push('(title LIKE ? OR summary LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (tag) {
    where.push('tag LIKE ?');
    params.push(`%${tag}%`);
  }
  const sql =
    `SELECT ${LIST_FIELDS} FROM note` +
    (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
    ' ORDER BY recommend DESC, post_time DESC';
  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('NotesRoute#list 查询失败 %s', err.message);
    res.status(500).json({ message: '查询失败' });
  }
});

// GET /api/notes/:id — 详情
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ${DETAIL_FIELDS} FROM note WHERE id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: '笔记不存在' });
    res.json(rows[0]);
  } catch (err) {
    console.error('NotesRoute#detail 查询失败 %s', err.message);
    res.status(500).json({ message: '查询失败' });
  }
});

// POST /api/notes — 新增，服务端写入 ip 与时间
router.post('/', auth, async (req, res) => {
  const { parent, title, content, poster, tag, summary, recommend } = req.body || {};
  if (!title) return res.status(400).json({ message: '标题不能为空' });
  const now = new Date();
  try {
    const [result] = await pool.query(
      'INSERT INTO note (parent, title, content, poster, ip, tag, summary, recommend, post_time, edit_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        parent ?? -1,
        title,
        content ?? '',
        poster ?? null,
        clientIp(req),
        tag ?? null,
        summary ?? null,
        recommend ? 1 : 0,
        now,
        now
      ]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error('NotesRoute#create 新增失败 %s', err.message);
    res.status(500).json({ message: '新增失败' });
  }
});

// PUT /api/notes/:id — 更新，写入 edit_time
router.put('/:id', auth, async (req, res) => {
  const { title, content, poster, tag, summary, recommend } = req.body || {};
  if (!title) return res.status(400).json({ message: '标题不能为空' });
  try {
    const [result] = await pool.query(
      'UPDATE note SET title=?, content=?, poster=?, tag=?, summary=?, recommend=?, edit_time=? WHERE id=?',
      [title, content ?? '', poster ?? null, tag ?? null, summary ?? null, recommend ? 1 : 0, new Date(), req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: '笔记不存在' });
    res.json({ id: Number(req.params.id) });
  } catch (err) {
    console.error('NotesRoute#update 更新失败 %s', err.message);
    res.status(500).json({ message: '更新失败' });
  }
});

// DELETE /api/notes/:id — 删除
router.delete('/:id', auth, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM note WHERE id=?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: '笔记不存在' });
    res.json({ id: Number(req.params.id) });
  } catch (err) {
    console.error('NotesRoute#remove 删除失败 %s', err.message);
    res.status(500).json({ message: '删除失败' });
  }
});

export default router;
