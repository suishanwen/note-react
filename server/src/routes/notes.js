import { Router } from 'express';
import pool from '../db.js';
import { auth, canViewEncrypted } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/error.js';

const router = Router();

// 列表字段不含 content，减小传输体积
const LIST_FIELDS =
  'id, parent, title, tag, summary, poster, recommend, post_time AS postTime, edit_time AS editTime';
const DETAIL_FIELDS =
  'id, parent, title, content, tag, summary, poster, ip, recommend, post_time AS postTime, edit_time AS editTime';

const ENCRYPTED = -1;
const TOP_LEVEL = -1;

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
// 笔记自身或任一祖先加密，则视为加密 —— 父级加锁，整棵子树都锁。
// 列表接口本就需要全量行做遮罩，故在此一次性构建判定函数。
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
    } else if (node.parent != null && node.parent !== TOP_LEVEL) {
      result = resolve(node.parent, seen);
    } else {
      result = false;
    }
    cache.set(id, result);
    return result;
  };
  return (id) => resolve(id, new Set());
}

// 查询单条笔记是否处于加密路径下：只沿 parent 链逐级上溯，避免全表扫描。
// 含环保护；任一节点（自身或祖先）加密即返回 true。
async function isPathEncrypted(id) {
  const seen = new Set();
  let currentId = id;
  while (currentId != null && currentId !== TOP_LEVEL && !seen.has(currentId)) {
    seen.add(currentId);
    const [rows] = await pool.query('SELECT parent, recommend FROM note WHERE id = ?', [currentId]);
    if (!rows.length) return false;
    const node = rows[0];
    if (node.recommend === ENCRYPTED) return true;
    currentId = node.parent;
  }
  return false;
}

// GET /api/notes — 列表。加密判定沿 parent 链：父级加锁则整棵子树都锁。
// 不在 SQL 层按关键字/摘要过滤，避免加密内容经搜索泄露；过滤由前端在可见数据上做
router.get(
  '/',
  canViewEncrypted,
  asyncHandler(async (req, res) => {
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
  })
);

// GET /api/notes/:id — 详情。自身或任一祖先加密，未授权一律 403
router.get(
  '/:id',
  canViewEncrypted,
  asyncHandler(async (req, res) => {
    if (!req.canViewEncrypted && (await isPathEncrypted(Number(req.params.id)))) {
      throw new HttpError(403, '该笔记已加密，请登录后查看');
    }
    const [rows] = await pool.query(`SELECT ${DETAIL_FIELDS} FROM note WHERE id = ?`, [
      req.params.id
    ]);
    if (!rows.length) throw new HttpError(404, '笔记不存在');
    res.json(rows[0]);
  })
);

// POST /api/notes — 新增，服务端写入 ip 与时间
router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { parent, title, content, poster, tag, summary, recommend } = req.body || {};
    if (!title) throw new HttpError(400, '标题不能为空');
    const now = new Date();
    const [result] = await pool.query(
      'INSERT INTO note (parent, title, content, poster, ip, tag, summary, recommend, post_time, edit_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        parent ?? TOP_LEVEL,
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
  })
);

// PUT /api/notes/:id — 更新，写入 edit_time
router.put(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const { parent, title, content, poster, tag, summary, recommend } = req.body || {};
    if (!title) throw new HttpError(400, '标题不能为空');
    const [result] = await pool.query(
      'UPDATE note SET parent=?, title=?, content=?, poster=?, tag=?, summary=?, recommend=?, edit_time=? WHERE id=?',
      [
        parent ?? TOP_LEVEL,
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
    if (!result.affectedRows) throw new HttpError(404, '笔记不存在');
    res.json({ id: Number(req.params.id) });
  })
);

// PATCH /api/notes/:id/parent — 仅调整父级（拖拽改层级用），不改 edit_time 避免排序跳动
router.patch(
  '/:id/parent',
  auth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const parent = req.body?.parent ?? TOP_LEVEL;
    if (Number(parent) === id) {
      throw new HttpError(400, '不能将笔记设为自身的子级');
    }
    const [result] = await pool.query('UPDATE note SET parent=? WHERE id=?', [parent, id]);
    if (!result.affectedRows) throw new HttpError(404, '笔记不存在');
    res.json({ id });
  })
);

// DELETE /api/notes/:id — 删除
router.delete(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const [result] = await pool.query('DELETE FROM note WHERE id=?', [req.params.id]);
    if (!result.affectedRows) throw new HttpError(404, '笔记不存在');
    res.json({ id: Number(req.params.id) });
  })
);

export default router;
