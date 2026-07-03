import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchNote, fetchNotes, createNote, updateNote, uploadImage } from '../api/notes';
import type { NoteInput } from '../types';
import MarkdownEditor from '../components/MarkdownEditor';
import LiveTableEditor from '../components/LiveTableEditor';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { isLiveOnly, extractLive, wrapLive } from '../utils/liveBlock';
import { buildTree, flattenTree, isDescendant } from '../utils/tree';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
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
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [form, setForm] = useState<NoteInput>(empty);
  const [mode, setMode] = useState<EditMode>('markdown');
  const [errorMsg, setErrorMsg] = useState('');
  // 基线快照：与当前表单比对判断“未保存”
  const [baseline, setBaseline] = useState<string>(JSON.stringify(empty));
  // 保存成功后跳转不触发拦截
  const skipBlock = useRef(false);

  useDocumentTitle(isEdit ? `编辑 · ${form.title || '笔记'}` : '新建笔记');

  // 编辑模式：拉取原数据填充
  const { data: existing } = useQuery({
    queryKey: ['note', id],
    queryFn: () => fetchNote(id!),
    enabled: isEdit
  });

  // 父级下拉选项：现有笔记按层级缩进；编辑时排除自身及其子孙（防自指/成环）
  const { data: allNotes } = useQuery({ queryKey: ['notes', true], queryFn: () => fetchNotes() });
  const parentOptions = useMemo(() => {
    const tree = buildTree(allNotes ?? []);
    const selfId = isEdit ? Number(id) : null;
    const selfNode =
      selfId != null ? flattenTree(tree).find((n) => n.id === selfId) ?? null : null;
    return flattenTree(tree).filter(
      (n) => n.id !== selfId && !(selfNode && isDescendant(selfNode, n.id))
    );
  }, [allNotes, id, isEdit]);

  useEffect(() => {
    if (existing) {
      const raw = existing.content ?? '';
      // content 始终是 Markdown（live 笔记为 ```live 块），加载时原样填入，不做格式转换
      const filled: NoteInput = {
        parent: existing.parent ?? -1,
        title: existing.title ?? '',
        content: raw,
        summary: existing.summary ?? '',
        tag: existing.tag ?? '',
        poster: existing.poster ?? '',
        recommend: existing.recommend ?? 0
      };
      setForm(filled);
      setBaseline(JSON.stringify(filled));
      setMode(isLiveOnly(raw) ? 'live' : 'markdown');
    }
  }, [existing]);

  // 新建模式：恢复本地草稿
  useEffect(() => {
    if (!isEdit) {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        try {
          const parsed = JSON.parse(draft) as NoteInput;
          setForm(parsed);
          setMode(isLiveOnly(parsed.content) ? 'live' : 'markdown');
          toast('已恢复未保存的草稿', 'info');
        } catch {
          localStorage.removeItem(DRAFT_KEY);
        }
      }
    }
  }, [isEdit, toast]);

  // 新建模式：自动保存草稿
  useEffect(() => {
    if (!isEdit) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    }
  }, [form, isEdit]);

  const update = (patch: Partial<NoteInput>) => setForm((f) => ({ ...f, ...patch }));

  const isDirty = JSON.stringify(form) !== baseline && !skipBlock.current;
  // 新建模式有 localStorage 草稿兜底，只拦截编辑已有笔记
  const shouldBlock = isEdit && isDirty;

  // 站内导航拦截：未保存时确认
  const blocker = useBlocker(shouldBlock);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    let cancelled = false;
    confirm({
      title: '放弃未保存的修改？',
      message: '当前笔记有未保存的修改，离开后将丢失。',
      confirmText: '放弃修改',
      danger: true
    }).then((ok) => {
      if (cancelled) return;
      if (ok) blocker.proceed();
      else blocker.reset();
    });
    return () => {
      cancelled = true;
    };
  }, [blocker, confirm]);

  // 关闭/刷新页面拦截
  useEffect(() => {
    if (!shouldBlock) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [shouldBlock]);

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
      toast('已保存', 'success');
      skipBlock.current = true;
      navigate(`/note/${res.id}`);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
      toast(err.message, 'error');
    }
  });

  const onSubmit = useCallback(() => {
    setErrorMsg('');
    if (!form.title.trim()) {
      setErrorMsg('标题不能为空');
      toast('标题不能为空', 'error');
      return;
    }
    saveMutation.mutate(form);
  }, [form, saveMutation, toast]);

  // Cmd/Ctrl+S 保存
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!saveMutation.isPending) onSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSubmit, saveMutation.isPending]);

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
          <select
            className="input"
            value={form.parent}
            onChange={(e) => update({ parent: parseInt(e.target.value, 10) })}
          >
            <option value={-1}>顶级笔记（无父级）</option>
            {parentOptions.map((n) => (
              <option key={n.id} value={n.id}>
                {`${'　'.repeat(n.depth)}${n.title}`}
              </option>
            ))}
          </select>
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
        <LiveTableEditor value={extractLive(form.content)} onChange={onLiveChange} />
      )}

      <p className="editor-hint">
        {mode === 'markdown'
          ? '左侧写 Markdown（可内嵌 HTML），右侧实时预览；粘贴或拖拽图片自动上传'
          : '可视化改表格数据或直接编辑 HTML/JS；脚本与主站隔离，无法访问登录凭证'}
      </p>

      {errorMsg && <div className="editor-error">{errorMsg}</div>}

      <div className="editor-actions">
        <span className="editor-dirty">{isDirty ? '有未保存的修改' : ''}</span>
        <button className="btn" onClick={() => navigate(-1)}>
          返回
        </button>
        <button className="btn btn-primary" disabled={saveMutation.isPending} onClick={onSubmit}>
          {saveMutation.isPending ? '保存中…' : '保存'}
          <kbd className="editor-kbd">⌘S</kbd>
        </button>
      </div>
    </div>
  );
}
