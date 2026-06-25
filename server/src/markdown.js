import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-'
});
turndown.use(gfm);

// HTML 转 Markdown，空内容兜底避免抛错
export function htmlToMarkdown(html) {
  if (!html) return '';
  return turndown.turndown(String(html)).trim();
}
