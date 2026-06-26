import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import 'highlight.js/styles/github.css';
import LiveBlock from './LiveBlock';
import './markdown.css';

// 历史笔记正文是原始 HTML（含表格、图片、格式），用 rehype-raw 解析、
// rehype-sanitize 净化：保留排版结构，剥除 <script>/onclick/<style> 等危险内容，
// 作为老 innerHTML 渲染的安全替代。
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // 保留代码块 language-* 类名，供高亮与 live 块识别
    code: [...(defaultSchema.attributes?.code ?? []), 'className']
  },
  // 历史图片含 base64 data URI，放行 data 协议
  protocols: {
    ...defaultSchema.protocols,
    src: [...(defaultSchema.protocols?.src ?? []), 'data']
  }
};

// 把代码块 children 还原为纯文本（防御 children 为数组的情况）
function childrenToText(children: unknown): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(childrenToText).join('');
  return children == null ? '' : String(children);
}

// ```live 代码块改用沙箱 iframe 执行；其它代码块照常高亮显示
const components = {
  code({ className, children, ...props }: any) {
    if (/\blanguage-live\b/.test(className || '')) {
      return <LiveBlock html={childrenToText(children)} />;
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }
};

export default function Markdown({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeSanitize, schema],
          [rehypeHighlight, { ignoreMissing: true }]
        ]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
