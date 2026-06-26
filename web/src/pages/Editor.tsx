import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MDEditor, { commands } from '@uiw/react-md-editor';
import { fetchNote, createNote, updateNote, uploadImage } from '../api/notes';
import type { NoteInput } from '../types';
import Markdown from '../components/Markdown';
import './editor.css';

// 编辑器预览复用正文渲染：```live 块在预览里即沙箱运行，所见即所得
const previewRender = (source: string) => <Markdown content={source} />;

const DRAFT_KEY = 'note_draft_new';

const empty: NoteInput = {
  parent: -1,
  title: '',
  content: '',
  summary: '',
  tag: '',
  poster: '',
  recommend: 0
};

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<NoteInput>(empty);
  const [errorMsg, setErrorMsg] = useState('');

  // 编辑模式：拉取原数据填充
  const { data: existing } = useQuery({
    queryKey: ['note', id],
    queryFn: () => fetchNote(id!),
    enabled: isEdit
  });

  useEffect(() => {
    if (existing) {
      setForm({
        parent: existing.parent ?? -1,
        title: existing.title ?? '',
        content: existing.content ?? '',
        summary: existing.summary ?? '',
        tag: existing.tag ?? '',
        poster: existing.poster ?? '',
        recommend: existing.recommend ?? 0
      });
    }
  }, [existing]);

  // 新建模式：恢复本地草稿
  useEffect(() => {
    if (!isEdit) {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        try {
          setForm(JSON.parse(draft));
        } catch {
          localStorage.removeItem(DRAFT_KEY);
        }
      }
    }
  }, [isEdit]);

  // 新建模式：自动保存草稿
  useEffect(() => {
    if (!isEdit) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    }
  }, [form, isEdit]);

  const update = (patch: Partial<NoteInput>) => setForm((f) => ({ ...f, ...patch }));

  const saveMutation = useMutation({
    mutationFn: (input: NoteInput) =>
      isEdit ? updateNote(Number(id), input) : createNote(input),
    onSuccess: (res) => {
      if (!isEdit) localStorage.removeItem(DRAFT_KEY);
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['note', String(res.id)] });
      navigate(`/note/${res.id}`);
    },
    onError: (err: Error) => setErrorMsg(err.message)
  });

  const onSubmit = () => {
    setErrorMsg('');
    if (!form.title.trim()) {
      setErrorMsg('标题不能为空');
      return;
    }
    saveMutation.mutate(form);
  };

  // 粘贴/拖拽图片自动上传并插入 Markdown
  const handleImage = useCallback(async (event: React.ClipboardEvent | React.DragEvent) => {
    const files =
      'clipboardData' in event
        ? event.clipboardData.files
        : (event as React.DragEvent).dataTransfer.files;
    const file = Array.from(files).find((f) => f.type.startsWith('image/'));
    if (!file) return;
    event.preventDefault();
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, content: `${f.content}\n![](${url})\n` }));
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  }, []);

  return (
    <div className="editor-page">
      <div className="editor-fields">
        <input
          className="input editor-title"
          placeholder="标题"
          value={form.title}
          onChange={(e) => update({ title: e.target.value })}
        />
        <div className="editor-row">
          <input
            className="input"
            placeholder="作者"
            value={form.poster}
            onChange={(e) => update({ poster: e.target.value })}
          />
          <input
            className="input"
            placeholder="标签（用 | 分隔）"
            value={form.tag}
            onChange={(e) => update({ tag: e.target.value })}
          />
        </div>
        <input
          className="input"
          placeholder="摘要（列表页展示）"
          value={form.summary}
          onChange={(e) => update({ summary: e.target.value })}
        />
        <div className="editor-row">
          <input
            className="input"
            type="number"
            placeholder="父级笔记 id（-1 为顶级）"
            value={form.parent}
            onChange={(e) => update({ parent: parseInt(e.target.value, 10) || -1 })}
          />
          <select
            className="input"
            value={form.recommend}
            onChange={(e) => update({ recommend: parseInt(e.target.value, 10) })}
          >
            <option value={0}>普通</option>
            <option value={1}>推荐</option>
            <option value={-1}>加密</option>
          </select>
        </div>
      </div>

      <div className="editor-md" onPaste={handleImage} onDrop={handleImage}>
        <MDEditor
          value={form.content}
          onChange={(v) => update({ content: v ?? '' })}
          height={460}
          preview="live"
          components={{ preview: previewRender }}
          extraCommands={[commands.codeEdit, commands.codeLive, commands.codePreview]}
        />
      </div>

      <p className="editor-hint">
        支持 Markdown，粘贴或拖拽图片自动上传；用 <code>```live</code> 代码块包裹
        HTML/JS，预览与详情页将在沙箱中运行
      </p>

      {errorMsg && <div className="editor-error">{errorMsg}</div>}

      <div className="editor-actions">
        <button className="btn" onClick={() => navigate(-1)}>
          返回
        </button>
        <button className="btn btn-primary" disabled={saveMutation.isPending} onClick={onSubmit}>
          {saveMutation.isPending ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  );
}
