// live 应用里 <table> 的「数据单元格」定位与最小化改写。
// 目标：可视化改单元格文本，但 <style>/<script>/属性/id/单元格数量与顺序字节级保留，
// 不破坏脚本按列索引读写的计算逻辑。故采用源码定点扫描，而非 DOM 重新序列化。

export interface TableCell {
  rowIndex: number;
  colIndex: number;
  tag: 'td' | 'th';
  // 带 id 的单元格视为脚本计算输出，只读
  id: string | null;
  // innerHTML 在源码中的起止下标
  contentStart: number;
  contentEnd: number;
  // 首个非空文本节点的原文（供输入框编辑），无则空串
  text: string;
  // 单元格全部可见文本（去标签），仅供表头标签展示
  display: string;
}

export interface ParsedTable {
  rows: TableCell[][];
}

// 跳过以 '<' 开头的标签，返回 '>' 之后的下标；处理引号内的 '>'
function scanTagEnd(src: string, lt: number): number {
  let i = lt + 1;
  let quote = '';
  while (i < src.length) {
    const ch = src[i];
    if (quote) {
      if (ch === quote) quote = '';
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '>') {
      return i + 1;
    }
    i++;
  }
  return src.length;
}

// 读取 '<' 处的标签名与是否闭合标签
function tagNameAt(src: string, lt: number): { name: string; close: boolean } {
  let i = lt + 1;
  let close = false;
  if (src[i] === '/') {
    close = true;
    i++;
  }
  let name = '';
  while (i < src.length && /[a-zA-Z0-9]/.test(src[i])) {
    name += src[i];
    i++;
  }
  return { name: name.toLowerCase(), close };
}

// 从开始标签文本中取 id 属性
function matchId(openTag: string): string | null {
  const m = openTag.match(/\sid\s*=\s*"([^"]*)"|\sid\s*=\s*'([^']*)'/i);
  if (!m) return null;
  const id = (m[1] ?? m[2] ?? '').trim();
  return id || null;
}

// 无闭合标签的空元素
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param',
  'source', 'track', 'wbr'
]);

// 跳过 '<' 处元素的整棵子树，返回其结束后的下标（void/自闭合仅跳开始标签）
function skipElement(s: string, lt: number): number {
  const { name } = tagNameAt(s, lt);
  const tagEnd = scanTagEnd(s, lt);
  if (VOID_TAGS.has(name) || /\/>\s*$/.test(s.slice(lt, tagEnd))) return tagEnd;
  let depth = 1;
  let i = tagEnd;
  while (i < s.length) {
    const nlt = s.indexOf('<', i);
    if (nlt < 0) return s.length;
    const t = tagNameAt(s, nlt);
    const nEnd = scanTagEnd(s, nlt);
    if (t.name === name) {
      if (t.close) {
        depth--;
        if (depth === 0) return nEnd;
      } else if (!/\/>\s*$/.test(s.slice(nlt, nEnd))) {
        depth++;
      }
    }
    i = nEnd;
  }
  return s.length;
}

// 找单元格内首个非空「顶层」文本节点；跳过子元素整棵子树，
// 避免命中隐藏 div 等噪声节点内部的文本
function firstTextRun(inner: string): { text: string; start: number; end: number } | null {
  let i = 0;
  while (i < inner.length) {
    const lt = inner.indexOf('<', i);
    const textEnd = lt < 0 ? inner.length : lt;
    const seg = inner.slice(i, textEnd);
    if (seg.trim() !== '') return { text: seg, start: i, end: textEnd };
    if (lt < 0) break;
    i = skipElement(inner, lt);
  }
  return null;
}

// 仅转义文本内容必需的字符（& 必须最先）
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 去除标签并解码常见实体，得到纯可见文本（仅供表头标签展示）
function stripTags(inner: string): string {
  let out = '';
  let i = 0;
  while (i < inner.length) {
    const lt = inner.indexOf('<', i);
    if (lt < 0) {
      out += inner.slice(i);
      break;
    }
    out += inner.slice(i, lt);
    i = scanTagEnd(inner, lt);
  }
  return out
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

// 解析首个 <table>；含嵌套表格则放弃可视化（返回 null，退回源码视图）
export function parseTable(src: string): ParsedTable | null {
  const lower = src.toLowerCase();
  const tOpen = lower.indexOf('<table');
  if (tOpen < 0) return null;

  const contentStart = scanTagEnd(src, tOpen);
  let i = contentStart;
  let depth = 1;
  let nested = false;
  let contentEnd = -1;
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt < 0) break;
    const { name, close } = tagNameAt(src, lt);
    if (name === 'table') {
      if (close) {
        depth--;
        if (depth === 0) {
          contentEnd = lt;
          break;
        }
      } else {
        depth++;
        nested = true;
      }
    }
    i = scanTagEnd(src, lt);
  }
  if (contentEnd < 0 || nested) return null;

  const rows: TableCell[][] = [];
  let row: TableCell[] | null = null;
  let rowIndex = -1;
  i = contentStart;
  while (i < contentEnd) {
    const lt = src.indexOf('<', i);
    if (lt < 0 || lt >= contentEnd) break;
    const { name, close } = tagNameAt(src, lt);
    const tagEnd = scanTagEnd(src, lt);

    if (name === 'tr' && !close) {
      rowIndex++;
      row = [];
      rows.push(row);
      i = tagEnd;
      continue;
    }
    if ((name === 'td' || name === 'th') && !close) {
      if (!row) {
        rowIndex++;
        row = [];
        rows.push(row);
      }
      const openTag = src.slice(lt, tagEnd);
      const cStart = tagEnd;
      let cEnd = lower.indexOf(`</${name}`, cStart);
      if (cEnd < 0 || cEnd > contentEnd) cEnd = contentEnd;
      const inner = src.slice(cStart, cEnd);
      const run = firstTextRun(inner);
      row.push({
        rowIndex,
        colIndex: row.length,
        tag: name,
        id: matchId(openTag),
        contentStart: cStart,
        contentEnd: cEnd,
        text: run ? run.text : '',
        display: stripTags(inner)
      });
      i = cEnd;
      continue;
    }
    i = tagEnd;
  }

  return rows.length ? { rows } : null;
}

// 把单元格首个文本节点替换为 newText；空单元格则插到最前。其余结构原样保留。
export function replaceCellText(src: string, cell: TableCell, newText: string): string {
  const inner = src.slice(cell.contentStart, cell.contentEnd);
  const run = firstTextRun(inner);
  const safe = escapeHtml(newText);
  const newInner = run ? inner.slice(0, run.start) + safe + inner.slice(run.end) : safe + inner;
  return src.slice(0, cell.contentStart) + newInner + src.slice(cell.contentEnd);
}
