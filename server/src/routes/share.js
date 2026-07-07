import { Router } from 'express';
import pool from '../db.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { isPathEncrypted } from '../encryption.js';

const router = Router();

// 分享页只暴露公开字段：不含 ip、不含 recommend/加密标记
const SHARE_FIELDS =
  'n.title, n.content, n.tag, n.poster, n.post_time AS postTime, n.edit_time AS editTime';

// GET /api/share/:token — 免登录读取被分享笔记
router.get(
  '/:token',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT s.note_id AS noteId, s.expire_time AS expireTime, ${SHARE_FIELDS}
       FROM note_share s JOIN note n ON n.id = s.note_id WHERE s.token = ?`,
      [req.params.token]
    );
    if (!rows.length) throw new HttpError(404, '分享不存在或已失效');

    const row = rows[0];
    if (row.expireTime && new Date(row.expireTime).getTime() < Date.now()) {
      throw new HttpError(410, '分享已过期');
    }
    // 分享后又被加密的笔记不再对外可读
    if (await isPathEncrypted(row.noteId)) throw new HttpError(404, '分享不存在或已失效');

    res.json({
      title: row.title,
      content: row.content,
      tag: row.tag,
      poster: row.poster,
      postTime: row.postTime,
      editTime: row.editTime
    });
  })
);

export default router;
