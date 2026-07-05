import { useEffect, useRef, useState, type ReactNode } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { useMediaQuery } from '../hooks/useMediaQuery';
import './liveEditor.css';

interface Props {
  // 编辑器源码
  value: string;
  onChange: (value: string) => void;
  // CodeMirror 语言/扩展（markdown / html 等），仅桌面端使用
  extensions: Extension[];
  // 左栏标题
  editorLabel: string;
  // 右栏标题
  previewLabel: string;
  // 预览渲染：用防抖后的内容渲染右栏
  renderPreview: (value: string) => ReactNode;
  // 左栏标题右侧的工具栏插槽（如 Markdown 的「代码块」按钮）
  toolbar?: ReactNode;
  // 暴露 CodeMirror 实例（桌面端），供工具栏操作选区
  onCreateEditor?: (view: EditorView) => void;
  // 暴露 textarea 元素（移动端），供工具栏操作选区
  onCreateTextarea?: (el: HTMLTextAreaElement) => void;
}

// 分栏编辑器：源码 + 防抖实时预览，Markdown 与 live 应用编辑器共用此骨架。
// 桌面端用 CodeMirror 固定高分栏；移动端用自动增高的原生 textarea——
// CodeMirror 的内部滚动层与选区处理会吃掉触摸手势，iOS Safari 收不起工具栏、
// 信号栏垫灰底，原生 textarea 无内部滚动，滑动即滚文档
export default function SplitEditor({
  value,
  onChange,
  extensions,
  editorLabel,
  previewLabel,
  renderPreview,
  toolbar,
  onCreateEditor,
  onCreateTextarea
}: Props) {
  const [preview, setPreview] = useState(value);
  const isMobile = useMediaQuery('(max-width: 900px)');
  const isDark =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'dark';

  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPreview(value), 300);
    return () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    };
  }, [value]);

  // 移动端 textarea 随内容自动增高，自身永不滚动
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value, isMobile]);

  return (
    <div className="live-editor">
      <div className="live-editor-pane">
        <div className="live-editor-label">
          <span>{editorLabel}</span>
          {toolbar && <div className="live-editor-toolbar">{toolbar}</div>}
        </div>
        {isMobile ? (
          <textarea
            ref={(el) => {
              taRef.current = el;
              if (el) onCreateTextarea?.(el);
            }}
            className="live-editor-textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            placeholder="开始书写…"
          />
        ) : (
          <CodeMirror
            value={value}
            height="460px"
            theme={isDark ? oneDark : 'light'}
            extensions={extensions}
            onChange={onChange}
            onCreateEditor={onCreateEditor}
            basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }}
          />
        )}
      </div>
      <div className="live-editor-pane">
        <div className="live-editor-label">{previewLabel}</div>
        <div className="live-editor-preview">{renderPreview(preview)}</div>
      </div>
    </div>
  );
}
