import mysql from 'mysql2/promise';
import config from './config.js';
import { htmlToMarkdown } from './markdown.js';

// note 表结构（与 note.sql 保持一致），随应用启动自动建表
const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS note (
  id int(11) NOT NULL AUTO_INCREMENT,
  parent int(11) DEFAULT -1,
  content mediumtext COLLATE utf8mb4_unicode_ci,
  edit_time datetime DEFAULT NULL,
  post_time datetime DEFAULT NULL,
  poster varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  title varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ip varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  tag varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  recommend int(11) DEFAULT 0,
  summary varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_post_time (post_time),
  KEY idx_edit_time (edit_time),
  KEY idx_recommend (recommend)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

// note_share 分享表：一篇笔记至多一条有效分享（note_id 唯一），token 免登录访问
const CREATE_SHARE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS note_share (
  id int(11) NOT NULL AUTO_INCREMENT,
  note_id int(11) NOT NULL,
  token varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  expire_time datetime DEFAULT NULL,
  create_time datetime NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_token (token),
  UNIQUE KEY uk_note (note_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

const MIGRATE_FIELDS =
  'id, parent, content, edit_time, post_time, poster, title, ip, tag, recommend, summary';

// 等待数据库可连接，远程库可能晚于 app 就绪
async function waitForDb() {
  const base = { ...config.db, database: undefined };
  for (let i = 1; i <= 30; i++) {
    try {
      const conn = await mysql.createConnection(base);
      await conn.end();
      return;
    } catch (err) {
      console.warn('Init#waitForDb 第 %d 次连接失败：%s', i, err.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error('数据库连接超时');
}

// 建库 + 建表
async function ensureSchema() {
  const admin = await mysql.createConnection({ ...config.db, database: undefined });
  await admin.query(
    `CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await admin.end();

  const conn = await mysql.createConnection({ ...config.db, charset: 'utf8mb4_unicode_ci' });
  await conn.query(CREATE_TABLE_SQL);
  await conn.query(CREATE_SHARE_TABLE_SQL);
  await conn.end();
}

// 首次自动迁移：新表为空且旧库存在时，旧库 HTML → Markdown 写入新库
async function autoMigrate() {
  const srcName = config.migrateSrcDb;
  if (!srcName || srcName === config.db.database) return;

  const conn = await mysql.createConnection({ ...config.db, charset: 'utf8mb4_unicode_ci' });
  try {
    const [[{ cnt }]] = await conn.query('SELECT COUNT(*) AS cnt FROM note');
    if (cnt > 0) {
      console.log('Init#autoMigrate 新库已有 %d 条数据，跳过迁移', cnt);
      return;
    }

    // 确认旧库存在且有 note 表
    const [srcTables] = await conn.query(
      'SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = ? LIMIT 1',
      [srcName, 'note']
    );
    if (!srcTables.length) {
      console.log('Init#autoMigrate 旧库 %s.note 不存在，跳过迁移', srcName);
      return;
    }

    const [rows] = await conn.query(
      `SELECT ${MIGRATE_FIELDS} FROM \`${srcName}\`.note ORDER BY id ASC`
    );
    console.log('Init#autoMigrate 旧库读取 %d 条，开始迁移', rows.length);

    await conn.beginTransaction();
    try {
      for (const r of rows) {
        await conn.query(
          `INSERT INTO note (${MIGRATE_FIELDS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            r.id,
            r.parent ?? -1,
            htmlToMarkdown(r.content),
            r.edit_time,
            r.post_time,
            r.poster,
            r.title,
            r.ip,
            r.tag,
            r.recommend ?? 0,
            r.summary
          ]
        );
      }
      await conn.commit();
      console.log('Init#autoMigrate 迁移完成 %d 条', rows.length);
    } catch (err) {
      await conn.rollback();
      throw err;
    }
  } finally {
    await conn.end();
  }
}

// 启动初始化：建库建表 + 首次自动迁移
export async function initDatabase() {
  await waitForDb();
  await ensureSchema();
  await autoMigrate();
}
