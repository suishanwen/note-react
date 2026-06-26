import { marked } from 'marked';
import { isLiveOnly } from './liveBlock';

// 统一文档渲染源：把笔记内容规整为 HTML。
// - 单个 live 块：保留 ```live 围栏，交由 Markdown 组件渲染为沙箱
// - 其余：marked 转 HTML（marked 会原样保留内嵌 HTML、同时转换 Markdown 语法），
//   保证「详情页展示」与「编辑器文档模式」走同一套转换、效果一致
export function toEditableHtml(content: string): string {
  const c = content ?? '';
  if (!c.trim()) return '';
  if (isLiveOnly(c)) return c;
  return marked.parse(c, { async: false }) as string;
}
