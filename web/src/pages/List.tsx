import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchNotes } from '../api/notes';
import NoteCard from '../components/NoteCard';
import './list.css';

export default function List() {
  const [keyword, setKeyword] = useState('');
  const [activeTag, setActiveTag] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['notes'],
    queryFn: () => fetchNotes()
  });

  // 关键字与标签在前端过滤，列表已全量加载
  const filtered = useMemo(() => {
    const list = data ?? [];
    const kw = keyword.trim().toLowerCase();
    return list.filter((note) => {
      const matchKw =
        !kw ||
        note.title.toLowerCase().includes(kw) ||
        (note.summary ?? '').toLowerCase().includes(kw);
      const matchTag = !activeTag || (note.tag ?? '').split('|').includes(activeTag);
      return matchKw && matchTag;
    });
  }, [data, keyword, activeTag]);

  return (
    <div className="list-page">
      <div className="list-search">
        <input
          className="input"
          placeholder="搜索标题或摘要…"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        {activeTag && (
          <button className="tag tag-active" onClick={() => setActiveTag('')}>
            #{activeTag} ✕
          </button>
        )}
      </div>

      {isLoading && (
        <div className="list-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      )}

      {isError && <div className="center-box">加载失败：{(error as Error).message}</div>}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="center-box">暂无笔记</div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="list-grid">
          {filtered.map((note) => (
            <NoteCard key={note.id} note={note} onTagClick={setActiveTag} />
          ))}
        </div>
      )}
    </div>
  );
}
