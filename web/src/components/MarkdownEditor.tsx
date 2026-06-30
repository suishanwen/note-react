import { useRef } from 'react';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import Markdown from './Markdown';
import SplitEditor from './SplitEditor';

interface Props {
  value: string;
  onChange: (md: string) => void;
}

// 将选区用 ``` 围栏包裹为代码块；无选区时插入空围栏并把光标放入其中。
// 代码块内空格/缩进原样保留，解决配置类文本行首缩进被 Markdown 吞掉的问题。
function wrapAsCodeBlock(view: EditorView) {
  const { state } = view;
  const { from, to } = state.selection.main;
  const selected = state.sliceDoc(from, to);
  const needLeadingNl = from > 0 && state.sliceDoc(from - 1, from) !== '\n';
  const lead = needLeadingNl ? '\n' : '';
  const insert = `${lead}\`\`\`\n${selected}\n\`\`\`\n`;
  // 无选区时光标落在围栏中间空行；有选区时选中被包裹的正文
  const cursor = selected
    ? { anchor: from + lead.length + 4, head: from + lead.length + 4 + selected.length }
    : { anchor: from + lead.length + 4 };
  view.dispatch({
    changes: { from, to, insert },
    selection: cursor
  });
  view.focus();
}

// Markdown 编辑器：CodeMirror 源码 + 复用正文渲染的实时预览（所见即所得）
export default function MarkdownEditor({ value, onChange }: Props) {
  const viewRef = useRef<EditorView | null>(null);

  return (
    <SplitEditor
      value={value}
      onChange={onChange}
      extensions={[markdown(), EditorView.lineWrapping]}
      editorLabel="Markdown 源码"
      previewLabel="实时预览"
      renderPreview={(v) => <Markdown content={v} />}
      onCreateEditor={(view) => {
        viewRef.current = view;
      }}
      toolbar={
        <button
          type="button"
          className="md-tool-btn"
          title="将选中内容包裹为代码块（保留缩进/空格）"
          onClick={() => viewRef.current && wrapAsCodeBlock(viewRef.current)}
        >
          代码块
        </button>
      }
    />
  );
}
