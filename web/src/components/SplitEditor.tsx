import { useEffect, useRef, useState, type ReactNode } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import './liveEditor.css';

interface Props {
  // 编辑器源码
  value: string;
  onChange: (value: string) => void;
  // CodeMirror 语言/扩展（markdown / html 等）
  extensions: Extension[];
  // 左栏标题
  editorLabel: string;
  // 右栏标题
  previewLabel: string;
  // 预览渲染：用防抖后的内容渲染右栏
  renderPreview: (value: string) => ReactNode;
  // 左栏标题右侧的工具栏插槽（如 Markdown 的「代码块」按钮）
  toolbar?: ReactNode;
  // 暴露 CodeMirror 实例，供工具栏操作选区
  onCreateEditor?: (view: EditorView) => void;
}

// 分栏编辑器：左 CodeMirror 源码，右防抖实时预览。
// Markdown 与 live 应用编辑器共用此骨架，仅语言与预览不同。
export default function SplitEditor({
  value,
  onChange,
  extensions,
  editorLabel,
  previewLabel,
  renderPreview,
  toolbar,
  onCreateEditor
}: Props) {
  const [preview, setPreview] = useState(value);
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

  return (
    <div className="live-editor">
      <div className="live-editor-pane">
        <div className="live-editor-label">
          <span>{editorLabel}</span>
          {toolbar && <div className="live-editor-toolbar">{toolbar}</div>}
        </div>
        <CodeMirror
          value={value}
          height="460px"
          theme={isDark ? oneDark : 'light'}
          extensions={extensions}
          onChange={onChange}
          onCreateEditor={onCreateEditor}
          basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }}
        />
      </div>
      <div className="live-editor-pane">
        <div className="live-editor-label">{previewLabel}</div>
        <div className="live-editor-preview">{renderPreview(preview)}</div>
      </div>
    </div>
  );
}
