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

// 基于全量行（含 id/parent/recommend）构建"有效加密"判定：
// 笔记自身或任一祖先加密，则视为加密 —— 父级加锁，整棵子树都锁
function makeEncryptionResolver(rows) {
  const map = new Map();
  for (const r of rows) map.set(r.id, r);
  const cache = new Map();
  const resolve = (id, seen) => {
    if (cache.has(id)) return cache.get(id);
    const node = map.get(id);
    if (!node || seen.has(id)) return false;
    seen.add(id);
    let result;
    if (node.recommend === ENCRYPTED) {
      result = true;
    } else if (node.parent != null && node.parent !== -1) {
      result = resolve(node.parent, seen);
    } else {
      result = false;
    }
    cache.set(id, result);
    return result;
  };
  return (id) => resolve(id, new Set());
}

// 查询某笔记是否处于加密路径下（自身或祖先加密）
async function isPathEncrypted(id) {
  const [rows] = await pool.query('SELECT id, parent, recommend FROM note');
  return makeEncryptionResolver(rows)(id);
}

// GET /api/notes — 列表。加密判定沿 parent 链：父级加锁则整棵子树都锁
// 不在 SQL 层按关键字/摘要过滤，避免加密内容经搜索泄露；过滤由前端在可见数据上做
router.get('/', canViewEncrypted, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ${LIST_FIELDS} FROM note ORDER BY COALESCE(edit_time, post_time) DESC`
    );
    const isEnc = makeEncryptionResolver(rows);
    const result = rows.map((row) => {
      if (isEnc(row.id) && !req.canViewEncrypted) {
        // 加密路径下：仅暴露标题与层级，抹除摘要/标签，标记 locked
        return {
          id: row.id,
          parent: row.parent,
          title: row.title,
          tag: null,
          summary: null,
          poster: null,
          recommend: ENCRYPTED,
          postTime: row.postTime,
          editTime: row.editTime,
          locked: true
        };
      }
      return { ...row, locked: false };
    });
    res.json(result);
  } catch (err) {
    console.error('NotesRoute#list 查询失败 %s', err.message);
    res.status(500).json({ message: '查询失败' });
  }
});

// GET /api/notes/:id — 详情。自身或任一祖先加密，未授权一律 403
router.get('/:id', canViewEncrypted, async (req, res) => {
  try {
    if (!req.canViewEncrypted && (await isPathEncrypted(Number(req.params.id)))) {
      return res.status(403).json({ message: '该笔记已加密，请登录后查看', locked: true });
    }
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
