import { useEffect, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';
import LiveBlock from './LiveBlock';
import './liveEditor.css';

interface Props {
  // live 块内部源码（HTML/JS）
  value: string;
  onChange: (src: string) => void;
}

// 可运行应用编辑器：左 CodeMirror 编辑源码，右沙箱实时预览。
// 预览防抖更新，避免每次按键都重建 iframe。
export default function LiveEditor({ value, onChange }: Props) {
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
        <div className="live-editor-label">HTML / JS 源码</div>
        <CodeMirror
          value={value}
          height="460px"
          theme={isDark ? oneDark : 'light'}
          extensions={[html()]}
          onChange={onChange}
          basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }}
        />
      </div>
      <div className="live-editor-pane">
        <div className="live-editor-label">实时预览 · 沙箱运行</div>
        <div className="live-editor-preview">
          <LiveBlock html={preview} />
        </div>
      </div>
    </div>
  );
}
