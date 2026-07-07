import pool from './db.js';

const ENCRYPTED = -1;
const TOP_LEVEL = -1;

// 查询单条笔记是否处于加密路径下：只沿 parent 链逐级上溯，避免全表扫描。
// 含环保护；任一节点（自身或祖先）加密即返回 true。
export async function isPathEncrypted(id) {
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
