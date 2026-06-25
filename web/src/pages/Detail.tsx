import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchNote, deleteNote } from '../api/notes';
import { ApiError } from '../api/client';
import { useAuth } from '../auth';
import Markdown from '../components/Markdown';
import { formatDateTime } from '../utils/date';
import { ENCRYPTED, RECOMMEND } from '../types';
import './detail.css';

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthed } = useAuth();
  const [confirming, setConfirming] = useState(false);

  const { data: note, isLoading, isError, error } = useQuery({
    queryKey: ['note', id, isAuthed],
    queryFn: () => fetchNote(id!),
    enabled: !!id,
    retry: false
  });

  const removeMutation = useMutation({
    mutationFn: () => deleteNote(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      navigate('/');
    }
  });

  if (isLoading) {
    return (
      <div className="detail-page">
        <div className="skeleton" style={{ height: 34, width: '60%', marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 200 }} />
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
            ← 返回列表
          </Link>
        </div>
      </div>
    );
  }

  if (isError || !note) {
    return <div className="center-box">加载失败：{(error as Error)?.message ?? '笔记不存在'}</div>;
  }

  const tags = note.tag ? note.tag.split('|').filter(Boolean) : [];

  return (
    <article className="detail-page">
      <header className="detail-header">
        <h1 className="detail-title">
          {note.recommend === ENCRYPTED && <span className="detail-flag" title="加密">🔒</span>}
          {note.recommend === RECOMMEND && <span className="detail-flag" title="推荐">⭐</span>}
          {note.title}
        </h1>
        <div className="detail-meta">
          {note.poster && <span>{note.poster}</span>}
          <span>发布于 {formatDateTime(note.postTime)}</span>
          {note.editTime && note.editTime !== note.postTime && (
            <span>最后编辑 {formatDateTime(note.editTime)}</span>
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

      <Markdown content={note.content} />

      <div className="detail-actions">
        <Link to="/" className="btn">
          ← 返回
        </Link>
        {isAuthed && (
          <div className="detail-admin">
            <Link to={`/edit/${note.id}`} className="btn">
              编辑
            </Link>
            {confirming ? (
              <>
                <button
                  className="btn btn-danger"
                  disabled={removeMutation.isPending}
                  onClick={() => removeMutation.mutate()}
                >
                  确认删除
                </button>
                <button className="btn" onClick={() => setConfirming(false)}>
                  取消
                </button>
              </>
            ) : (
              <button className="btn btn-danger" onClick={() => setConfirming(true)}>
                删除
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
