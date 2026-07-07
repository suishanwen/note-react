import { Router } from 'express';
import crypto from 'node:crypto';
import pool from '../db.js';
import { auth, canViewEncrypted } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { isPathEncrypted } from '../encryption.js';

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

// DELETE /api/notes/:id — 删除，一并清理该笔记的分享，避免残留孤儿链接
router.delete(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const [result] = await pool.query('DELETE FROM note WHERE id=?', [req.params.id]);
    if (!result.affectedRows) throw new HttpError(404, '笔记不存在');
    await pool.query('DELETE FROM note_share WHERE note_id=?', [req.params.id]);
    res.json({ id: Number(req.params.id) });
  })
);

// 有效期时长 → 过期时间；forever 返回 null 表示永久
function resolveExpireTime(duration) {
  const now = Date.now();
  if (duration === 'week') return new Date(now + 7 * 24 * 60 * 60 * 1000);
  if (duration === 'forever') return null;
  // 默认与 day 一致：24 小时
  return new Date(now + 24 * 60 * 60 * 1000);
}

// GET /api/notes/:id/share — 查询当前分享，未分享返回 null
router.get(
  '/:id/share',
  auth,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      'SELECT token, expire_time AS expireTime FROM note_share WHERE note_id=?',
      [req.params.id]
    );
    res.json(rows.length ? rows[0] : null);
  })
);

// POST /api/notes/:id/share — 生成或重设分享（换新 token + 有效期）
router.post(
  '/:id/share',
  auth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const [notes] = await pool.query('SELECT id FROM note WHERE id=?', [id]);
    if (!notes.length) throw new HttpError(404, '笔记不存在');
    if (await isPathEncrypted(id)) throw new HttpError(400, '该笔记已加密，不可分享');

    const token = crypto.randomBytes(24).toString('hex');
    const expireTime = resolveExpireTime(req.body?.duration);
    await pool.query(
      `INSERT INTO note_share (note_id, token, expire_time, create_time) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE token=VALUES(token), expire_time=VALUES(expire_time), create_time=VALUES(create_time)`,
      [id, token, expireTime, new Date()]
    );
    res.status(201).json({ token, expireTime });
  })
);

// DELETE /api/notes/:id/share — 取消分享，旧链接立即失效
router.delete(
  '/:id/share',
  auth,
  asyncHandler(async (req, res) => {
    await pool.query('DELETE FROM note_share WHERE note_id=?', [req.params.id]);
    res.json({ id: Number(req.params.id) });
  })
);

export default router;
