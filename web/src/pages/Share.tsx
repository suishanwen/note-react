import { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchShared } from '../api/notes';
import { ApiError } from '../api/client';
import Markdown from '../components/Markdown';
import Toc from '../components/Toc';
import { useTheme } from '../hooks/useTheme';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatDateTime } from '../utils/date';
import './share.css';

// 主题切换按钮：分享页唯一操作，复用 useTheme
function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button className="share-theme-btn" onClick={toggle} title="切换主题" aria-label="切换主题">
      {theme === 'light' ? (
        <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
          <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
          <circle cx="8" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

// 公开分享页：独立只读页，不含任何笔记操作入口
export default function Share() {
  const { token } = useParams<{ token: string }>();
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: note, isLoading, isError, error } = useQuery({
    queryKey: ['share', token],
    queryFn: () => fetchShared(token!),
    enabled: !!token,
    retry: false
  });

  useDocumentTitle(note?.title);

  const tags = note?.tag ? note.tag.split('|').filter(Boolean) : [];
  const invalid = isError && error instanceof ApiError && (error.status === 404 || error.status === 410);

  return (
    <div className="share-page">
      <header className="share-topbar">
        <span className="share-brand">Note</span>
        <ThemeToggle />
      </header>

      <main className="share-main">
        {isLoading ? (
          <div className="share-body">
            <div className="skeleton" style={{ height: 34, width: '60%', marginBottom: 20 }} />
            <div className="skeleton" style={{ height: 16, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 16, width: '92%', marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 180, marginTop: 24 }} />
          </div>
        ) : invalid ? (
          <div className="share-empty">
            <div className="share-empty-icon">🔗</div>
            <h2>{error instanceof ApiError && error.status === 410 ? '分享已过期' : '分享不存在或已失效'}</h2>
            <p>该链接可能已被取消分享或超过有效期。</p>
          </div>
        ) : note ? (
          <div className="share-layout">
            <article className="share-body">
              <header className="share-header">
                <h1 className="share-article-title">{note.title}</h1>
                <div className="share-meta">
                  {note.poster && <span>{note.poster}</span>}
                  <span>发布于 {formatDateTime(note.postTime)}</span>
                  {note.editTime && note.editTime !== note.postTime && (
                    <span>最后编辑 {formatDateTime(note.editTime)}</span>
                  )}
                </div>
                {tags.length > 0 && (
                  <div className="share-tags">
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
            </article>

            <aside className="share-aside">
              <Toc contentRef={contentRef} content={note.content} />
            </aside>
          </div>
        ) : (
          <div className="share-empty">
            <div className="share-empty-icon">⚠️</div>
            <h2>加载失败</h2>
            <p>{(error as Error)?.message ?? '请稍后重试'}</p>
          </div>
        )}
      </main>

      <footer className="share-footer">内容由 Note 分享</footer>
    </div>
  );
}
