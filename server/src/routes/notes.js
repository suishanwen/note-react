import { Router } from 'express';
import pool from '../db.js';
import { auth, canViewEncrypted } from '../middleware/auth.js';

const router = Router();

// 列表字段不含 content，减小传输体积
const LIST_FIELDS =
  'id, parent, title, tag, summary, poster, recommend, post_time AS postTime, edit_time AS editTime';
const DETAIL_FIELDS =
  'id, parent, title, content, tag, summary, poster, ip, recommend, post_time AS postTime, edit_time AS editTime';

const ENCRYPTED = -1;

// 取真实客户端 IP
function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.socket.remoteAddress || null;
}

// 归一化 recommend 为三态：-1 加密 / 1 推荐 / 0 普通
function normalizeRecommend(value) {
  if (value === ENCRYPTED || value === '-1') return ENCRYPTED;
  if (value === 1 || value === '1' || value === true) return 1;
  return 0;
}

// 列表项脱敏：无权查看加密笔记时，抹除摘要并标记 locked，保留标题与层级
function maskListRow(row, canView) {
  if (row.recommend === ENCRYPTED && !canView) {
    return { ...row, summary: null, tag: null, locked: true };
  }
  return { ...row, locked: false };
}

// GET /api/notes?keyword=&tag= — 列表，支持标题/摘要关键字与标签筛选
router.get('/', canViewEncrypted, async (req, res) => {
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
    ' ORDER BY (recommend = 1) DESC, COALESCE(edit_time, post_time) DESC';
  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows.map((row) => maskListRow(row, req.canViewEncrypted)));
  } catch (err) {
    console.error('NotesRoute#list 查询失败 %s', err.message);
    res.status(500).json({ message: '查询失败' });
  }
});

// GET /api/notes/:id — 详情，加密笔记需管理员或解锁令牌
router.get('/:id', canViewEncrypted, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ${DETAIL_FIELDS} FROM note WHERE id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: '笔记不存在' });
    const note = rows[0];
    if (note.recommend === ENCRYPTED && !req.canViewEncrypted) {
      return res.status(403).json({ message: '该笔记已加密，请输入授权码解锁', locked: true });
    }
    res.json(note);
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
        normalizeRecommend(recommend),
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
  const { parent, title, content, poster, tag, summary, recommend } = req.body || {};
  if (!title) return res.status(400).json({ message: '标题不能为空' });
  try {
    const [result] = await pool.query(
      'UPDATE note SET parent=?, title=?, content=?, poster=?, tag=?, summary=?, recommend=?, edit_time=? WHERE id=?',
      [
        parent ?? -1,
        title,
        content ?? '',
        poster ?? null,
        tag ?? null,
        summary ?? null,
        normalizeRecommend(recommend),
        new Date(),
        req.params.id
      ]
    );
    if (!result.affectedRows) return res.status(404).json({ message: '笔记不存在' });
    res.json({ id: Number(req.params.id) });
  } catch (err) {
    console.error('NotesRoute#update 更新失败 %s', err.message);
    res.status(500).json({ message: '更新失败' });
  }
});

// PATCH /api/notes/:id/parent — 仅调整父级（拖拽改层级用），不改 edit_time 避免排序跳动
router.patch('/:id/parent', auth, async (req, res) => {
  const id = Number(req.params.id);
  const parent = req.body?.parent ?? -1;
  // 防止把节点挂到自己下面
  if (Number(parent) === id) {
    return res.status(400).json({ message: '不能将笔记设为自身的子级' });
  }
  try {
    const [result] = await pool.query('UPDATE note SET parent=? WHERE id=?', [parent, id]);
    if (!result.affectedRows) return res.status(404).json({ message: '笔记不存在' });
    res.json({ id });
  } catch (err) {
    console.error('NotesRoute#setParent 调整层级失败 %s', err.message);
    res.status(500).json({ message: '调整层级失败' });
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
