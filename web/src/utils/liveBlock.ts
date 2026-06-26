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
