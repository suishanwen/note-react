// live 应用笔记的内容形态判定与转换。
// 约定：可运行小应用的 content 为「单个 ```live 围栏块」，块内是原始 HTML/JS。

const FENCE = '```';
// 匹配整段恰为单个 live 块：```live\n<源码>\n```（允许首尾空白）
const LIVE_ONLY = /^\s*```live\s*\n([\s\S]*?)\n?```\s*$/;

// content 是否恰为单个 live 块（即「可运行应用」笔记）
export function isLiveOnly(content: string): boolean {
  return LIVE_ONLY.test(content ?? '');
}

// 取出 live 块内部源码；非 live-only 时原样返回去空白后的内容
export function extractLive(content: string): string {
  const m = (content ?? '').match(LIVE_ONLY);
  return m ? m[1] : (content ?? '').trim();
}

// 把源码包成单个 live 块
export function wrapLive(src: string): string {
  return `${FENCE}live\n${(src ?? '').trim()}\n${FENCE}\n`;
}

// 把 live 源码按第一个 <table>…</table> 拆成三段：表格前 / 表格 / 表格后。
// 用于「可视化编辑表格 + 保留样式与脚本」：表格交给富文本编辑，pre/post 保留原样。
export interface LiveParts {
  pre: string;
  table: string;
  post: string;
  hasTable: boolean;
}

export function splitLive(src: string): LiveParts {
  const s = src ?? '';
  const start = s.search(/<table\b/i);
  if (start === -1) return { pre: '', table: '', post: s, hasTable: false };
  // 匹配到对应的 </table>（表格内不允许嵌套 table，历史数据满足）
  const endMatch = s.slice(start).match(/<\/table\s*>/i);
  if (!endMatch || endMatch.index == null) {
    return { pre: '', table: '', post: s, hasTable: false };
  }
  const end = start + endMatch.index + endMatch[0].length;
  return {
    pre: s.slice(0, start),
    table: s.slice(start, end),
    post: s.slice(end),
    hasTable: true
  };
}

// 用编辑后的表格 HTML 重组回完整 live 源码
export function joinLive(parts: { pre: string; table: string; post: string }): string {
  return `${parts.pre}${parts.table}${parts.post}`;
}

// 源码是否含表格（决定用可视化表格编辑器还是纯代码编辑器）
export function hasTable(src: string): boolean {
  return /<table\b/i.test(src ?? '');
}
