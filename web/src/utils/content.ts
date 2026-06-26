import { marked } from 'marked';

// 判定内容是否已是 HTML（含成对标签），用于决定加载富文本编辑器前是否需转换
export function looksLikeHtml(content: string): boolean {
  return /<(table|div|p|br|img|h[1-6]|ul|ol|strong|em|a|span|pre|blockquote)\b[^>]*>/i.test(
    content ?? ''
  );
}

// 富文本编辑器以 HTML 为载体：Markdown 笔记转 HTML，已是 HTML 则原样返回
export function toEditableHtml(content: string): string {
  const c = content ?? '';
  if (!c.trim()) return '';
  if (looksLikeHtml(c)) return c;
  return marked.parse(c, { async: false }) as string;
}
