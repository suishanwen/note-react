import { useEffect } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import { uploadImage } from '../api/notes';
import './richEditor.css';

interface Props {
  // 正文 HTML
  value: string;
  onChange: (html: string) => void;
}

// 所见即所得富文本编辑器：可视化编辑表格、标题、列表、图片等，正文以 HTML 存储
export default function RichEditor({ value, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      TableKit.configure({ table: { resizable: true } })
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML())
  });

  // 外部 value 变化（如加载完成、切换模式）时同步进编辑器，避免覆盖正在输入的内容
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="rich-editor">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="rich-editor-content markdown-body" />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const insertImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const url = await uploadImage(file);
        editor.chain().focus().setImage({ src: url }).run();
      } catch {
        /* 上传失败由全局错误体现 */
      }
    };
    input.click();
  };

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('链接地址', prev ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
  };

  const inTable = editor.isActive('table');

  return (
    <div className="rich-toolbar">
      <Btn on={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} label="B" title="加粗" bold />
      <Btn on={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} label="I" title="斜体" italic />
      <Btn on={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} label="S" title="删除线" />
      <span className="rich-sep" />
      <Btn on={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} label="H1" title="标题1" />
      <Btn on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} label="H2" title="标题2" />
      <Btn on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} label="H3" title="标题3" />
      <span className="rich-sep" />
      <Btn on={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} label="• 列表" title="无序列表" />
      <Btn on={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} label="1. 列表" title="有序列表" />
      <Btn on={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} label="❝" title="引用" />
      <Btn on={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} label="</>" title="代码块" />
      <span className="rich-sep" />
      <Btn on={setLink} active={editor.isActive('link')} label="🔗" title="链接" />
      <Btn on={insertImage} label="🖼" title="插入图片" />
      <span className="rich-sep" />
      <Btn
        on={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        label="⊞ 表格"
        title="插入表格"
      />
      {inTable && (
        <>
          <Btn on={() => editor.chain().focus().addColumnAfter().run()} label="+列" title="右侧加列" />
          <Btn on={() => editor.chain().focus().deleteColumn().run()} label="−列" title="删列" />
          <Btn on={() => editor.chain().focus().addRowAfter().run()} label="+行" title="下方加行" />
          <Btn on={() => editor.chain().focus().deleteRow().run()} label="−行" title="删行" />
          <Btn on={() => editor.chain().focus().deleteTable().run()} label="✕表" title="删表格" />
        </>
      )}
    </div>
  );
}

function Btn({
  on,
  active,
  label,
  title,
  bold,
  italic
}: {
  on: () => void;
  active?: boolean;
  label: string;
  title: string;
  bold?: boolean;
  italic?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      className={`rich-btn${active ? ' active' : ''}`}
      style={{ fontWeight: bold ? 700 : undefined, fontStyle: italic ? 'italic' : undefined }}
      onMouseDown={(e) => e.preventDefault()}
      onClick={on}
    >
      {label}
    </button>
  );
}
