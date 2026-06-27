import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchNote, createNote, updateNote, uploadImage } from '../api/notes';
import type { NoteInput } from '../types';
import MarkdownEditor from '../components/MarkdownEditor';
import LiveEditor from '../components/LiveEditor';
import { isLiveOnly, extractLive, wrapLive } from '../utils/liveBlock';
import './editor.css';

// 文档(Markdown) / 应用(可运行 live)。统一以 Markdown 为存储格式
type EditMode = 'markdown' | 'live';

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
  const [mode, setMode] = useState<EditMode>('markdown');
  const [errorMsg, setErrorMsg] = useState('');

  // 编辑模式：拉取原数据填充
  const { data: existing } = useQuery({
    queryKey: ['note', id],
    queryFn: () => fetchNote(id!),
    enabled: isEdit
  });

  useEffect(() => {
    if (existing) {
      const raw = existing.content ?? '';
      // content 始终是 Markdown（live 笔记为 ```live 块），加载时原样填入，不做格式转换
      setForm({
        parent: existing.parent ?? -1,
        title: existing.title ?? '',
        content: raw,
        summary: existing.summary ?? '',
        tag: existing.tag ?? '',
        poster: existing.poster ?? '',
        recommend: existing.recommend ?? 0
      });
      setMode(isLiveOnly(raw) ? 'live' : 'markdown');
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

  // 切换内容类型：Markdown ⇄ live 无损往返（都是 Markdown 存储，仅 live 多一层围栏）
  const switchMode = (next: EditMode) => {
    if (next === mode) return;
    setForm((f) => {
      if (next === 'live') {
        return { ...f, content: isLiveOnly(f.content) ? f.content : wrapLive(f.content) };
      }
      return { ...f, content: isLiveOnly(f.content) ? extractLive(f.content) : f.content };
    });
    setMode(next);
  };

  // 应用模式下 LiveEditor 编辑的是 live 块内部源码，存回时重新包裹
  const onLiveChange = (src: string) => update({ content: wrapLive(src) });

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

      <div className="editor-mode">
        <button type="button" className={mode === 'markdown' ? 'active' : ''} onClick={() => switchMode('markdown')}>
          文档
        </button>
        <button type="button" className={mode === 'live' ? 'active' : ''} onClick={() => switchMode('live')}>
          可运行应用
        </button>
      </div>

      {mode === 'markdown' && (
        <div onPaste={handleImage} onDrop={handleImage}>
          <MarkdownEditor value={form.content} onChange={(md) => update({ content: md })} />
        </div>
      )}

      {mode === 'live' && (
        <LiveEditor value={extractLive(form.content)} onChange={onLiveChange} />
      )}

      <p className="editor-hint">
        {mode === 'markdown'
          ? '左侧写 Markdown（可内嵌 HTML），右侧实时预览；粘贴或拖拽图片自动上传'
          : '左侧编辑 HTML/JS，右侧沙箱实时预览；脚本与主站隔离，无法访问登录凭证'}
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
