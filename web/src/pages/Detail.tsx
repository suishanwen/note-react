import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchNote, fetchNotes, deleteNote } from '../api/notes';
import { ApiError } from '../api/client';
import { useAuth } from '../auth';
import Markdown from '../components/Markdown';
import ShareDialog from '../components/ShareDialog';
import Toc from '../components/Toc';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { buildTree, flattenTree } from '../utils/tree';
import { formatDateTime } from '../utils/date';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ENCRYPTED, RECOMMEND } from '../types';
import './detail.css';

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthed } = useAuth();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const contentRef = useRef<HTMLDivElement>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const { data: note, isLoading, isError, error } = useQuery({
    queryKey: ['note', id, isAuthed],
    queryFn: () => fetchNote(id!),
    enabled: !!id,
    retry: false
  });

  // 上一篇/下一篇：按侧栏树的先序顺序
  const { data: allNotes } = useQuery({
    queryKey: ['notes', isAuthed],
    queryFn: () => fetchNotes()
  });
  const { prev, next } = useMemo(() => {
    const flat = flattenTree(buildTree(allNotes ?? []));
    const idx = flat.findIndex((n) => n.id === Number(id));
    return {
      prev: idx > 0 ? flat[idx - 1] : null,
      next: idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null
    };
  }, [allNotes, id]);

  useDocumentTitle(note?.title);

  // 切换笔记时回到内容区顶部（桌面端内部滚动容器；移动端文档滚动由 Layout 统一回顶）
  useEffect(() => {
    document.querySelector('.workbench-main')?.scrollTo({ top: 0 });
  }, [id]);

  const removeMutation = useMutation({
    mutationFn: () => deleteNote(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast('已删除笔记', 'success');
      navigate('/');
    },
    onError: (err: Error) => toast(err.message, 'error')
  });

  const onDelete = async () => {
    const ok = await confirm({
      title: `删除「${note?.title}」？`,
      message: '删除后无法恢复，其子笔记会保留并上移一级。',
      confirmText: '删除',
      danger: true
    });
    if (ok) removeMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="detail-page">
        <div className="detail-body">
          <div className="skeleton" style={{ height: 34, width: '60%', marginBottom: 20 }} />
          <div className="skeleton" style={{ height: 14, width: '35%', marginBottom: 32 }} />
          <div className="skeleton" style={{ height: 16, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 16, width: '92%', marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 16, width: '85%', marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 180, marginTop: 24 }} />
        </div>
      </div>
    );
  }

  // 加密笔记：未登录无法查看，引导去登录
  if (isError && error instanceof ApiError && error.status === 403) {
    return (
      <div className="detail-page">
        <div className="locked-box">
          <div className="locked-icon">🔒</div>
          <h2>该笔记已加密</h2>
          <p>请登录管理员账号后查看</p>
          <Link
            to="/login"
            state={{ from: `/note/${id}` }}
            className="btn btn-primary"
          >
            去登录
          </Link>
          <Link to="/" className="btn locked-back">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  if (isError || !note) {
    return (
      <div className="center-box">
        <p>加载失败：{(error as Error)?.message ?? '笔记不存在'}</p>
        <Link to="/" className="btn">
          返回首页
        </Link>
      </div>
    );
  }

  const tags = note.tag ? note.tag.split('|').filter(Boolean) : [];

  return (
    <div className="detail-page">
      <article className="detail-body">
        <header className="detail-header">
          <h1 className="detail-title">
            {note.recommend === ENCRYPTED && <span className="detail-flag" title="加密">🔒</span>}
            {note.recommend === RECOMMEND && <span className="detail-flag detail-flag-rec" title="推荐">★</span>}
            {note.title}
          </h1>
          <div className="detail-meta">
            {note.poster && <span>{note.poster}</span>}
            <span>发布于 {formatDateTime(note.postTime)}</span>
            {note.editTime && note.editTime !== note.postTime && (
              <span>最后编辑 {formatDateTime(note.editTime)}</span>
            )}
            {isAuthed && (
              <span className="detail-header-admin">
                <Link to={`/edit/${note.id}`} className="detail-op">
                  编辑
                </Link>
                {note.recommend !== ENCRYPTED && (
                  <button className="detail-op" onClick={() => setShareOpen(true)}>
                    分享
                  </button>
                )}
                <button className="detail-op detail-op-danger" disabled={removeMutation.isPending} onClick={onDelete}>
                  删除
                </button>
              </span>
            )}
          </div>
          {tags.length > 0 && (
            <div className="detail-tags">
              {tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        <div ref={contentRef}>
          <Markdown content={note.content} />
        </div>

        <nav className="detail-siblings" aria-label="相邻笔记">
          {prev ? (
            <Link to={`/note/${prev.id}`} className="detail-sibling">
              <span className="detail-sibling-label">上一篇</span>
              <span className="detail-sibling-title">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link to={`/note/${next.id}`} className="detail-sibling detail-sibling-next">
              <span className="detail-sibling-label">下一篇</span>
              <span className="detail-sibling-title">{next.title}</span>
            </Link>
          )}
        </nav>
      </article>

      <aside className="detail-aside">
        <Toc contentRef={contentRef} content={note.content} />
      </aside>

      {shareOpen && <ShareDialog noteId={note.id} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
