import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchNotes } from '../api/notes';
import { useAuth } from '../auth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import Footer from '../components/Footer';
import { fromNow } from '../utils/date';
import { RECOMMEND, ENCRYPTED, type NoteSummary } from '../types';
import './home.css';

// 内容区首屏：推荐笔记 + 最近更新，快速进入阅读
export default function Home() {
  const { isAuthed } = useAuth();
  useDocumentTitle('Note');

  const { data, isLoading } = useQuery({
    queryKey: ['notes', isAuthed],
    queryFn: () => fetchNotes()
  });

  const notes = data ?? [];
  const recommended = notes.filter((n) => n.recommend === RECOMMEND).slice(0, 6);
  const recent = [...notes]
    .sort((a, b) => {
      const ta = new Date((a.editTime ?? a.postTime ?? 0) as string).getTime() || 0;
      const tb = new Date((b.editTime ?? b.postTime ?? 0) as string).getTime() || 0;
      return tb - ta;
    })
    .slice(0, 8);

  if (isLoading) {
    return (
      <div className="home-page">
        <div className="skeleton" style={{ height: 24, width: 180, marginBottom: 20 }} />
        <div className="home-card-grid">
          {Array.from({ length: 4 }).map((_, i) => (
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
      <Footer />
    </div>
  );
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
