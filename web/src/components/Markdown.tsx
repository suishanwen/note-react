import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import 'highlight.js/styles/github.css';
import './markdown.css';

// 历史笔记正文是原始 HTML（含表格、图片、格式），用 rehype-raw 解析、
// rehype-sanitize 净化：保留排版结构，剥除 <script>/onclick/<style> 等危险内容，
// 作为老 innerHTML 渲染的安全替代。
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // 保留代码块 language-* 类名，供后续高亮识别语言
    code: [...(defaultSchema.attributes?.code ?? []), 'className']
  },
  // 历史图片含 base64 data URI，放行 data 协议
  protocols: {
    ...defaultSchema.protocols,
    src: [...(defaultSchema.protocols?.src ?? []), 'data']
  }
};

export default function Markdown({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, schema], rehypeHighlight]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
