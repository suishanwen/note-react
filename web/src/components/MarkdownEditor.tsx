import { useEffect, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import Markdown from './Markdown';
import './liveEditor.css';

interface Props {
  // Markdown 正文
  value: string;
  onChange: (md: string) => void;
}

// Markdown 编辑器：左 CodeMirror 源码，右复用正文渲染实时预览。
// 与详情页同一套 Markdown 组件，所见即所得；预览防抖更新。
export default function MarkdownEditor({ value, onChange }: Props) {
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
        <div className="live-editor-label">Markdown 源码</div>
        <CodeMirror
          value={value}
          height="460px"
          theme={isDark ? oneDark : 'light'}
          extensions={[markdown(), EditorView.lineWrapping]}
          onChange={onChange}
          basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }}
        />
      </div>
      <div className="live-editor-pane">
        <div className="live-editor-label">实时预览</div>
        <div className="live-editor-preview">
          <Markdown content={preview} />
        </div>
      </div>
    </div>
  );
}
