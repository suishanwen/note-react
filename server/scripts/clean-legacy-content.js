// 一次性清洗：剥除历史笔记正文里泄漏的 CSS 文本
// 来源：老系统把苹果邮件/网页粘贴的 HTML 原样存进 content，迁移成 Markdown 后
// 其内联 <style>/苹果邮件样式退化为纯文本（形如 "p.p1 {margin:...} span.s1 {color:#xxx}"），
// 显示在笔记顶部成为乱码。本脚本仅删除这类 CSS 规则文本，不触碰正文与代码块。
//
// 用法：
//   node scripts/clean-legacy-content.js --dry-run   预览全部将改动的行（不写库）
//   node scripts/clean-legacy-content.js             正式写库（写前自动备份到本地文件）
// 连接信息复用 config（DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import config from '../src/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dryRun = process.argv.includes('--dry-run');

// 已知 CSS 属性：规则体须命中其一，作为"这是 CSS 而非代码"的强判据
const CSS_PROP =
  /\b(?:margin|padding|font|font-size|font-family|font-variant[\w-]*|color|background[\w-]*|min-height|max-height|min-width|max-width|width|height|line-height|text-align|letter-spacing|word-spacing|white-space|vertical-align|display|float|border[\w-]*|text-decoration|list-style[\w-]*)\b\s*:/i;

// 选择器安全字符集：允许 #id/.class/标签 起头，禁止 () " ' = / 等代码特征，避免误伤 JS/JSON
const SAFE_SELECTOR = /^[A-Za-z.#][A-Za-z0-9 .,#>:_~+-]*$/;

// 规则体安全字符集：禁止 " ( ) { } < > = 等，苹果 CSS 仅含单引号
const SAFE_BODY = /^[\s\w.,#%';:_-]*$/;

// 判定 { ... } 内是否为 CSS 声明体（而非代码块）
function isCssBody(body) {
  return CSS_PROP.test(body) && SAFE_BODY.test(body) && !body.includes('"');
}

// 判定选择器是否为安全的 CSS 选择器形态
function isSafeSelector(sel) {
  const s = sel.trim();
  return s.length > 0 && s.length <= 60 && SAFE_SELECTOR.test(s);
}

// 单条完整规则：选择器 { 单行声明 }
const RULE = /([A-Za-z.#][A-Za-z0-9 .,#>:_~+-]*?)\s*\{([^{}\n]*)\}/;
// 连续规则串（行首或换行后起，空白分隔的一条或多条规则）
const RULE_RUN = new RegExp(
  `(^|\\n)[ \\t]*((?:${RULE.source}[ \\t]*)+)`,
  'g'
);
// 被截断的尾部规则：选择器 { 单行声明（无闭合，直到换行或 < 标签）
const DANGLING = /(^|\n)[ \t]*([A-Za-z.#][A-Za-z0-9 .,#>:_~+-]*?)\s*\{([^{}\n]*?)(?=\n|<)/g;

// 校验一段规则串是否整体都是 CSS（每条规则都通过判据），是则可整体删除
function runIsAllCss(run) {
  const re = new RegExp(RULE.source, 'g');
  let m;
  let count = 0;
  let lastEnd = 0;
  while ((m = re.exec(run)) !== null) {
    // 规则之间只能是空白，否则说明夹杂了非规则内容，放弃整体删除
    if (run.slice(lastEnd, m.index).trim() !== '') return false;
    if (!isSafeSelector(m[1]) || !isCssBody(m[2])) return false;
    lastEnd = m.index + m[0].length;
    count++;
  }
  return count > 0 && run.slice(lastEnd).trim() === '';
}

// 剥除泄漏 CSS，返回清洗后的正文。仅删除 CSS 文本，不改动其它任何字符
// （Markdown 中行尾空格表示硬换行，全局规整空白会篡改正文渲染，故不做）
function stripLeakedCss(text) {
  if (!text) return text;
  let s = text;
  let removed = false;

  // 1) 删除整段 CSS 规则串（行首/换行后）
  s = s.replace(RULE_RUN, (full, pre, run) => {
    if (!runIsAllCss(run)) return full;
    removed = true;
    return pre;
  });

  // 2) 删除被截断的尾部规则（仅当确为 CSS 声明）
  s = s.replace(DANGLING, (full, pre, sel, body) => {
    if (!(isSafeSelector(sel) && isCssBody(body))) return full;
    removed = true;
    return pre;
  });

  if (!removed) return text;
  // 仅收尾删除痕迹：开头残留空行、删除点产生的 3+ 连续空行；不动行尾空格
  return s.replace(/^\s+/, '').replace(/\n{3,}/g, '\n\n');
}

async function main() {
  const conn = await mysql.createConnection({
    ...config.db,
    charset: 'utf8mb4_unicode_ci'
  });
  const [rows] = await conn.query('SELECT id, title, content FROM note');

  const changed = [];
  for (const r of rows) {
    const before = String(r.content || '');
    const after = stripLeakedCss(before);
    if (after !== before) changed.push({ id: r.id, title: r.title, before, after });
  }

  console.log('CleanLegacy#main 扫描 %d 行，需清洗 %d 行', rows.length, changed.length);

  if (dryRun) {
    for (const c of changed) {
      console.log('\n========== id=%d  %s ==========', c.id, c.title);
      console.log('--- 删除的片段（首 200） ---');
      // 展示被删内容：取 before 比 after 多出的开头部分
      const removedHead = c.before.slice(0, c.before.length - c.after.length);
      console.log(JSON.stringify((removedHead || c.before).slice(0, 200)));
      console.log('--- 清洗后开头（首 160） ---');
      console.log(JSON.stringify(c.after.slice(0, 160)));
    }
    console.log('\nCleanLegacy#main dry-run 完成，未写库');
    await conn.end();
    return;
  }

  // 写前备份原内容到项目 .backups（已 gitignore），可回滚
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const bakDir = path.resolve(__dirname, '../../.backups');
  fs.mkdirSync(bakDir, { recursive: true });
  const bakFile = path.join(bakDir, `legacy-content-backup-${stamp}.json`);
  fs.writeFileSync(
    bakFile,
    JSON.stringify(
      changed.map((c) => ({ id: c.id, content: c.before })),
      null,
      2
    ),
    'utf8'
  );
  console.log('CleanLegacy#main 已备份 %d 行原内容到 %s', changed.length, bakFile);

  let ok = 0;
  for (const c of changed) {
    await conn.query('UPDATE note SET content=? WHERE id=?', [c.after, c.id]);
    ok++;
  }
  console.log('CleanLegacy#main 清洗写库完成 %d/%d', ok, changed.length);
  await conn.end();
}

main().catch((err) => {
  console.error('CleanLegacy#main 清洗失败 %s', err.message);
  process.exit(1);
});
