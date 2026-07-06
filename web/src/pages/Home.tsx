import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchNotes } from '../api/notes';
import { useAuth } from '../auth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import Footer from '../components/Footer';
import { fromNow } from '../utils/date';
import { RECOMMEND, ENCRYPTED, type NoteSummary } from '../types';
import './home.css';

const DAY = 86400000;

// 内容区首屏：主列（推荐 + 最近更新）+ 右侧信息栏（统计/标签/时间线）
export default function Home() {
  const { isAuthed } = useAuth();
  useDocumentTitle('Note');

  const { data, isLoading } = useQuery({
    queryKey: ['notes', isAuthed],
    queryFn: () => fetchNotes()
  });

  const notes = useMemo(() => data ?? [], [data]);
  const recommended = useMemo(
    () => notes.filter((n) => n.recommend === RECOMMEND).slice(0, 6),
    [notes]
  );
  const recent = useMemo(
    () =>
      [...notes]
        .sort((a, b) => noteTime(b) - noteTime(a))
        .slice(0, 8),
    [notes]
  );

  // 信息栏统计：全部由已拉取的列表数据推导，不额外请求
  const stats = useMemo(() => {
    const tagCount = new Map<string, number>();
    let week = 0;
    let month = 0;
    let year = 0;
    const now = Date.now();
    const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
    for (const n of notes) {
      (n.tag ?? '')
        .split('|')
        .filter(Boolean)
        .forEach((t) => tagCount.set(t, (tagCount.get(t) ?? 0) + 1));
      const t = noteTime(n);
      if (now - t < 7 * DAY) week++;
      if (now - t < 30 * DAY) month++;
      if (t >= yearStart) year++;
    }
    const topTags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
    return { total: notes.length, tagTotal: tagCount.size, week, month, year, topTags };
  }, [notes]);

  if (isLoading) {
    return (
      <div className="home-page">
        <div className="skeleton" style={{ height: 24, width: 180, marginBottom: 20 }} />
        <div className="home-card-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 92 }} />
          ))}
        </div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="home-page home-empty">
        <p className="home-empty-title">还没有笔记</p>
        {isAuthed ? (
          <Link to="/edit" className="btn btn-primary">
            写第一篇笔记
          </Link>
        ) : (
          <p className="home-empty-sub">登录后可以创建笔记</p>
        )}
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-layout">
        <div className="home-main">
          {recommended.length > 0 && (
            <section className="home-section">
              <h2 className="home-heading">推荐阅读</h2>
              <div className="home-card-grid">
                {recommended.map((n) => (
                  <NoteCard key={n.id} note={n} highlight />
                ))}
              </div>
            </section>
          )}

          <section className="home-section">
            <h2 className="home-heading">最近更新</h2>
            <div className="home-recent">
              {recent.map((n) => (
                <Link key={n.id} to={`/note/${n.id}`} className="home-recent-row">
                  <span className="home-recent-title">
                    {n.recommend === ENCRYPTED && <span className="home-flag" aria-label="加密">🔒</span>}
                    {n.title}
                  </span>
                  {n.summary && <span className="home-recent-summary">{n.summary}</span>}
                  <time className="home-recent-time">{fromNow(n.editTime ?? n.postTime)}</time>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <aside className="home-aside">
          <div className="home-panel">
            <div className="home-stat-grid">
              <div className="home-stat">
                <span className="home-stat-num">{stats.total}</span>
                <span className="home-stat-label">篇笔记</span>
              </div>
              <div className="home-stat">
                <span className="home-stat-num">{stats.tagTotal}</span>
                <span className="home-stat-label">个标签</span>
              </div>
            </div>
          </div>

          {stats.topTags.length > 0 && (
            <div className="home-panel">
              <h3 className="home-panel-title">常用标签</h3>
              <div className="home-panel-tags">
                {stats.topTags.map(([tag, count]) => (
                  <span key={tag} className="tag">
                    {tag}
                    <i className="home-tag-count">{count}</i>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="home-panel">
            <h3 className="home-panel-title">更新节奏</h3>
            <ul className="home-timeline">
              <li>
                <span>近一周</span>
                <b>{stats.week} 篇</b>
              </li>
              <li>
                <span>近一月</span>
                <b>{stats.month} 篇</b>
              </li>
              <li>
                <span>今年</span>
                <b>{stats.year} 篇</b>
              </li>
            </ul>
          </div>
        </aside>
      </div>
      <Footer />
    </div>
  );
}

// 取笔记的最后活跃时间戳（编辑优先，其次发布）
function noteTime(n: NoteSummary): number {
  return new Date((n.editTime ?? n.postTime ?? 0) as string).getTime() || 0;
}

function NoteCard({ note, highlight = false }: { note: NoteSummary; highlight?: boolean }) {
  const tags = note.tag ? note.tag.split('|').filter(Boolean) : [];
  return (
    <Link to={`/note/${note.id}`} className={`home-card${highlight ? ' home-card-rec' : ''}`}>
      <span className="home-card-title">{note.title}</span>
      {note.summary && <span className="home-card-summary">{note.summary}</span>}
      <span className="home-card-meta">
        {tags.slice(0, 2).map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
        <time>{fromNow(note.editTime ?? note.postTime)}</time>
      </span>
    </Link>
  );
}
