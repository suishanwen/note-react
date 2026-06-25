// 一次性数据迁移：旧库 HTML 笔记 → Markdown → 新库
// 用法：
//   node scripts/migrate.js --dry-run   仅抽样预览转换结果，不写库
//   node scripts/migrate.js             正式迁移
// 连接信息由环境变量提供：
//   旧库 SRC_DB_HOST/SRC_DB_PORT/SRC_DB_USER/SRC_DB_PASSWORD/SRC_DB_NAME
//   新库 复用 config（DB_HOST 等）
import mysql from 'mysql2/promise';
import config from '../src/config.js';
import { htmlToMarkdown } from '../src/markdown.js';

const dryRun = process.argv.includes('--dry-run');

const srcDb = {
  host: process.env.SRC_DB_HOST || 'localhost',
  port: parseInt(process.env.SRC_DB_PORT || '3306', 10),
  user: process.env.SRC_DB_USER || 'root',
  password: process.env.SRC_DB_PASSWORD || '',
  database: process.env.SRC_DB_NAME || 'note',
  charset: 'utf8mb4_unicode_ci'
};

async function main() {
  const src = await mysql.createConnection(srcDb);
  const [rows] = await src.query(
    'SELECT id, parent, content, edit_time, post_time, poster, title, ip, tag, recommend, summary FROM note ORDER BY id ASC'
  );
  console.log('Migrate#main 旧库读取 %d 条', rows.length);

  if (dryRun) {
    const samples = rows.slice(0, 3);
    for (const r of samples) {
      console.log('\n===== id=%d title=%s =====', r.id, r.title);
      console.log('--- HTML(前 300) ---\n%s', String(r.content || '').slice(0, 300));
      console.log('--- Markdown(前 300) ---\n%s', htmlToMarkdown(r.content).slice(0, 300));
    }
    console.log('\nMigrate#main dry-run 完成，未写入新库');
    await src.end();
    return;
  }

  const dest = await mysql.createConnection({ ...config.db, charset: 'utf8mb4_unicode_ci' });
  let ok = 0;
  for (const r of rows) {
    const content = htmlToMarkdown(r.content);
    // 保留原 id 与时间，标签/摘要原样迁移
    await dest.query(
      'INSERT INTO note (id, parent, content, edit_time, post_time, poster, title, ip, tag, recommend, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        r.id,
        r.parent ?? -1,
        content,
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
    ok++;
  }
  console.log('Migrate#main 迁移完成 %d/%d', ok, rows.length);
  await src.end();
  await dest.end();
}

main().catch((err) => {
  console.error('Migrate#main 迁移失败 %s', err.message);
  process.exit(1);
});
