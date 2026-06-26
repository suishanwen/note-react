import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { HardBreak } from '@tiptap/extension-hard-break';
import { Bold } from '@tiptap/extension-bold';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import CodeMirror from '@uiw/react-codemirror';
import { html as cmHtml } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';
import LiveBlock from './LiveBlock';
import { splitLive, joinLive } from '../utils/liveBlock';
import './liveEditor.css';
import './richEditor.css';

interface Props {
  // live 块内部源码（含表格 + 样式 + 脚本）
  value: string;
  onChange: (src: string) => void;
}

// 保留 id 属性的工厂：脚本靠 id 定位单元格/行，可视化编辑时必须保住
const keepId = {
  addAttributes(this: any) {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('id'),
        renderHTML: (attrs: Record<string, any>) => (attrs.id ? { id: attrs.id } : {})
      }
    };
  }
};
const TableId = Table.extend(keepId);
const TableRowId = TableRow.extend(keepId);
const TableCellId = TableCell.extend(keepId);
const TableHeaderId = TableHeader.extend(keepId);

// 可视化表格应用编辑器：表格所见即所得（保留 id），样式/脚本折叠保留，右侧实时预览
export default function LiveTableEditor({ value, onChange }: Props) {
  const parts = useMemo(() => splitLive(value), [value]);
  const [pre, setPre] = useState(parts.pre);
  const [post, setPost] = useState(parts.post);
  const [preview, setPreview] = useState(value);
  const [showCode, setShowCode] = useState(false);
  const isDark =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'dark';

  // 自身回写的源码，用于区分外部变更与内部编辑，避免输入时被重置/光标跳动
  const selfSrc = useRef<string>(value);

  // 重组三段 → 回写 + 防抖预览
  const timer = useRef<number | null>(null);
  const emit = (ed: Editor, p: string, q: string) => {
    const table = ed.getHTML();
    const src = joinLive({ pre: p, table, post: q });
    // 与回传的 value 比较基准对齐（父组件会 extractLive→trim 再传回），避免被判为外部变更
    selfSrc.current = src.trim();
    onChange(src);
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPreview(src), 300);
  };

  // 表格编辑器：只启用表格相关节点，避免把表格 HTML 解析成别的
  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      HardBreak,
      Bold,
      TableId.configure({ resizable: false }),
      TableRowId,
      TableCellId,
      TableHeaderId
    ],
    content: parts.table,
    onUpdate: ({ editor }) => emit(editor, pre, post)
  });

  // 仅在外部传入的 value 与自身回写不同（加载完成/切换模式）时才重载，
  // 内部编辑触发的 value 变化不重载，避免打断输入
  useEffect(() => {
    if (!editor) return;
    if (value === selfSrc.current) return;
    selfSrc.current = value;
    const next = splitLive(value);
    if (next.table !== editor.getHTML()) {
      editor.commands.setContent(next.table, { emitUpdate: false });
    }
    setPre(next.pre);
    setPost(next.post);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return null;

  const inTable = editor.isActive('table');

  return (
    <div className="live-table-editor">
      <div className="live-editor">
        <div className="live-editor-pane">
          <div className="live-editor-label">表格内容 · 可视化编辑</div>
          <div className="rich-toolbar lt-toolbar">
            <button
              type="button"
              className="rich-btn"
              onClick={() =>
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
              }
            >
              ⊞ 表格
            </button>
            {inTable && (
              <>
                <button type="button" className="rich-btn" onClick={() => editor.chain().focus().addColumnAfter().run()}>+列</button>
                <button type="button" className="rich-btn" onClick={() => editor.chain().focus().deleteColumn().run()}>−列</button>
                <button type="button" className="rich-btn" onClick={() => editor.chain().focus().addRowAfter().run()}>+行</button>
                <button type="button" className="rich-btn" onClick={() => editor.chain().focus().deleteRow().run()}>−行</button>
                <button type="button" className="rich-btn" onClick={() => editor.chain().focus().toggleBold().run()}>B</button>
              </>
            )}
          </div>
          <EditorContent editor={editor} className="rich-editor-content markdown-body lt-table" />
        </div>

        <div className="live-editor-pane">
          <div className="live-editor-label">实时预览 · 沙箱运行</div>
          <div className="live-editor-preview">
            <LiveBlock html={preview} />
          </div>
        </div>
      </div>

      <button type="button" className="lt-code-toggle" onClick={() => setShowCode((v) => !v)}>
        {showCode ? '▾ 收起样式与脚本' : '▸ 展开样式与脚本（高级）'}
      </button>

      {showCode && (
        <div className="lt-code">
          <div className="lt-code-block">
            <div className="live-editor-label">表格前（样式 / 说明）</div>
            <CodeMirror
              value={pre}
              height="160px"
              theme={isDark ? oneDark : 'light'}
              extensions={[cmHtml()]}
              onChange={(v) => {
                setPre(v);
                emit(editor, v, post);
              }}
            />
          </div>
          <div className="lt-code-block">
            <div className="live-editor-label">表格后（脚本 &lt;script&gt;）</div>
            <CodeMirror
              value={post}
              height="220px"
              theme={isDark ? oneDark : 'light'}
              extensions={[cmHtml()]}
              onChange={(v) => {
                setPost(v);
                emit(editor, pre, v);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
