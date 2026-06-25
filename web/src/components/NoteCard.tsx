import { Link } from 'react-router-dom';
import type { NoteSummary } from '../types';
import { fromNow } from '../utils/date';
import './noteCard.css';

interface Props {
  note: NoteSummary;
  onTagClick?: (tag: string) => void;
}

// 列表卡片：标题 + 摘要 + 元信息 + 标签
export default function NoteCard({ note, onTagClick }: Props) {
  const tags = note.tag ? note.tag.split('|').filter(Boolean) : [];
  return (
    <article className="note-card">
      <Link to={`/note/${note.id}`} className="note-card-main">
        <h2 className="note-card-title">
          {note.recommend ? <span className="pin" title="置顶">📌</span> : null}
          {note.title}
        </h2>
        {note.summary ? <p className="note-card-summary">{note.summary}</p> : null}
      </Link>
      <div className="note-card-meta">
        <span className="note-card-info">
          {note.poster ? <span>{note.poster}</span> : null}
          <span>{fromNow(note.postTime)}</span>
        </span>
        {tags.length > 0 && (
          <span className="note-card-tags">
            {tags.map((tag) => (
              <button
                key={tag}
                className="tag clickable"
                onClick={(e) => {
                  e.preventDefault();
                  onTagClick?.(tag);
                }}
              >
                {tag}
              </button>
            ))}
          </span>
        )}
      </div>
    </article>
  );
}
