import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import Markdown from './Markdown';
import SplitEditor from './SplitEditor';

interface Props {
  value: string;
  onChange: (md: string) => void;
}

// Markdown 编辑器：CodeMirror 源码 + 复用正文渲染的实时预览（所见即所得）
export default function MarkdownEditor({ value, onChange }: Props) {
  return (
    <SplitEditor
      value={value}
      onChange={onChange}
      extensions={[markdown(), EditorView.lineWrapping]}
      editorLabel="Markdown 源码"
      previewLabel="实时预览"
      renderPreview={(v) => <Markdown content={v} />}
    />
  );
}
