import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MDEditor, { commands } from '@uiw/react-md-editor';
import { fetchNote, createNote, updateNote, uploadImage } from '../api/notes';
import type { NoteInput } from '../types';
import Markdown from '../components/Markdown';
import RichEditor from '../components/RichEditor';
import LiveEditor from '../components/LiveEditor';
import LiveTableEditor from '../components/LiveTableEditor';
import { isLiveOnly, extractLive, wrapLive, hasTable } from '../utils/liveBlock';
import { toEditableHtml } from '../utils/content';
import './editor.css';

// 编辑器预览复用正文渲染：```live 块在预览里即沙箱运行，所见即所得
const previewRender = (source: string) => <Markdown content={source} />;

// 文档(所见即所得) / 源码(Markdown·HTML) / 应用(可运行 live)
type EditMode = 'rich' | 'source' | 'live';

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
  const [mode, setMode] = useState<EditMode>('rich');
  const [errorMsg, setErrorMsg] = useState('');

  // 编辑模式：拉取原数据填充
  const { data: existing } = useQuery({
    queryKey: ['note', id],
    queryFn: () => fetchNote(id!),
    enabled: isEdit
  });

  useEffect(() => {
    if (existing) {
      const content = existing.content ?? '';
      setForm({
        parent: existing.parent ?? -1,
        title: existing.title ?? '',
        content,
        summary: existing.summary ?? '',
        tag: existing.tag ?? '',
        poster: existing.poster ?? '',
        recommend: existing.recommend ?? 0
      });
      // live 块→应用模式；其余默认所见即所得文档模式
      setMode(isLiveOnly(content) ? 'live' : 'rich');
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

  // 切换内容类型：往返转换 content，确保数据不丢（统一存在 content 字段）
  const switchMode = (next: EditMode) => {
    if (next === mode) return;
    setForm((f) => {
      if (next === 'live') {
        // → 应用：非 live 则把现有正文作为初始源码包进 live 块
        return { ...f, content: isLiveOnly(f.content) ? f.content : wrapLive(f.content) };
      }
      if (next === 'rich') {
        // → 文档：从 live 还原内部源码；Markdown 转 HTML 供富文本编辑
        const raw = isLiveOnly(f.content) ? extractLive(f.content) : f.content;
        return { ...f, content: toEditableHtml(raw) };
      }
      // → 源码：从 live 还原内部源码，其余原样
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
        <button type="button" className={mode === 'rich' ? 'active' : ''} onClick={() => switchMode('rich')}>
          文档
        </button>
        <button type="button" className={mode === 'source' ? 'active' : ''} onClick={() => switchMode('source')}>
          源码
        </button>
        <button type="button" className={mode === 'live' ? 'active' : ''} onClick={() => switchMode('live')}>
          可运行应用
        </button>
      </div>

      {mode === 'rich' && (
        <RichEditor value={toEditableHtml(form.content)} onChange={(html) => update({ content: html })} />
      )}

      {mode === 'source' && (
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
      )}

      {mode === 'live' &&
        (hasTable(extractLive(form.content)) ? (
          <LiveTableEditor value={extractLive(form.content)} onChange={onLiveChange} />
        ) : (
          <LiveEditor value={extractLive(form.content)} onChange={onLiveChange} />
        ))}

      <p className="editor-hint">
        {mode === 'rich' &&
          '所见即所得：工具栏可视化编辑表格（增删行列）、标题、列表、图片、链接'}
        {mode === 'source' && '源码模式：直接写 Markdown / HTML，粘贴或拖拽图片自动上传'}
        {mode === 'live' && hasTable(extractLive(form.content)) &&
          '表格可视化编辑（自动求和等脚本保留运行），样式与脚本可在下方展开微调'}
        {mode === 'live' && !hasTable(extractLive(form.content)) &&
          '左侧编辑 HTML/JS，右侧沙箱实时预览；脚本与主站隔离，无法访问登录凭证'}
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
