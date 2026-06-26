// 一次性恢复：把历史"可运行小应用"笔记从旧库原始 HTML 还原，包进 ```live 围栏。
// 背景：旧系统这些笔记是完整 HTML（表格/表单 + <script>），用 innerHTML 承载；
// 迁移成 Markdown 时 <script> 与表单结构被破坏，脚本无法执行。
// 前端新增 LiveBlock：识别 ```live 块并放进 sandbox iframe 安全执行。
// 本脚本从旧库 sw 取回干净 HTML，重新写入新库为 live 块。
//
// 用法：
//   node scripts/restore-live-apps.js --dry-run   预览（不写库）
//   node scripts/restore-live-apps.js             正式写库（写前备份）
// 连接：新库复用 config（DB_*）；旧库同 host/账号/密码，库名由 SRC_DB_NAME（默认 sw）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import config from '../src/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dryRun = process.argv.includes('--dry-run');
const FENCE = '```';

// 需恢复的应用笔记。wrap 可对原始 HTML 做最小适配（补全脚本依赖的容器等）
const APPS = [
  { id: 158, wrap: (html) => html },
  // id=296 的脚本用 document.getElementById("noteDetail") 定位表格，旧时依赖整页容器，
  // 沙箱内需自带该容器
  { id: 296, wrap: (html) => `<div id="noteDetail">\n${html}\n</div>` },
  { id: 416, wrap: (html) => html }
];

function toLiveBlock(html) {
  // 包进 live 围栏；围栏前后留空行，保证 Markdown 正确识别为代码块
  return `${FENCE}live\n${html.trim()}\n${FENCE}\n`;
}

async function main() {
  const srcName = config.migrateSrcDb;
  if (!srcName) {
    console.error('RestoreLive#main 未配置旧库名 SRC_DB_NAME');
    process.exit(1);
  }
  const src = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: srcName,
    charset: 'utf8mb4_unicode_ci'
  });
  const dest = await mysql.createConnection({ ...config.db, charset: 'utf8mb4_unicode_ci' });

  const plans = [];
  for (const app of APPS) {
    const [srcRows] = await src.query('SELECT content FROM note WHERE id=?', [app.id]);
    if (!srcRows.length) {
      console.warn('RestoreLive#main 旧库无 id=%d，跳过', app.id);
      continue;
    }
    const rawHtml = String(srcRows[0].content || '');
    if (!rawHtml.trim()) {
      console.warn('RestoreLive#main 旧库 id=%d 内容为空，跳过', app.id);
      continue;
    }
    const [destRows] = await dest.query('SELECT content FROM note WHERE id=?', [app.id]);
    if (!destRows.length) {
      console.warn('RestoreLive#main 新库无 id=%d，跳过', app.id);
      continue;
    }
    const before = String(destRows[0].content || '');
    const after = toLiveBlock(app.wrap(rawHtml));
    plans.push({ id: app.id, before, after });
  }

  console.log('RestoreLive#main 待恢复 %d 条', plans.length);

  if (dryRun) {
    for (const p of plans) {
      console.log('\n========== id=%d ==========', p.id);
      console.log('--- 新内容开头(200) ---\n%s', p.after.slice(0, 200));
      console.log('--- 新内容长度 %d，含 live 围栏: %s', p.after.length, p.after.startsWith(FENCE + 'live'));
    }
    console.log('\nRestoreLive#main dry-run 完成，未写库');
    await src.end();
    await dest.end();
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const bakDir = path.resolve(__dirname, '../../.backups');
  fs.mkdirSync(bakDir, { recursive: true });
  const bakFile = path.join(bakDir, `live-apps-backup-${stamp}.json`);
  fs.writeFileSync(
    bakFile,
    JSON.stringify(plans.map((p) => ({ id: p.id, content: p.before })), null, 2),
    'utf8'
  );
  console.log('RestoreLive#main 已备份 %d 条原内容到 %s', plans.length, bakFile);

  let ok = 0;
  for (const p of plans) {
    await dest.query('UPDATE note SET content=? WHERE id=?', [p.after, p.id]);
    ok++;
  }
  console.log('RestoreLive#main 恢复写库完成 %d/%d', ok, plans.length);
  await src.end();
  await dest.end();
}

main().catch((err) => {
  console.error('RestoreLive#main 恢复失败 %s', err.message);
  process.exit(1);
});
