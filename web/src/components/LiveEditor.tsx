import { html } from '@codemirror/lang-html';
import { EditorView } from '@codemirror/view';
import LiveBlock from './LiveBlock';
import SplitEditor from './SplitEditor';

interface Props {
  // live 块内部源码（HTML/JS）
  value: string;
  onChange: (src: string) => void;
}

// 可运行应用编辑器：CodeMirror 源码 + 沙箱实时预览
export default function LiveEditor({ value, onChange }: Props) {
  return (
    <SplitEditor
      value={value}
      onChange={onChange}
      extensions={[html(), EditorView.lineWrapping]}
      editorLabel="HTML / JS 源码"
      previewLabel="实时预览 · 沙箱运行"
      renderPreview={(v) => <LiveBlock html={v} />}
    />
  );
}
