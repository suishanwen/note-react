import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchNotes } from '../api/notes';
import { useAuth } from '../auth';
import { useTheme } from '../hooks/useTheme';
import { ENCRYPTED, RECOMMEND } from '../types';
import './commandPalette.css';

interface Props {
  onClose: () => void;
}

interface Item {
  key: string;
  kind: 'note' | 'action';
  title: string;
  hint?: string;
  flag?: 'enc' | 'rec';
  run: () => void;
}

// Cmd+K 命令面板：模糊搜索笔记 + 快捷动作，键盘上下选择回车执行
export default function CommandPalette({ onClose }: Props) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  const { theme, toggle } = useTheme();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const { data } = useQuery({
    queryKey: ['notes', isAuthed],
    queryFn: () => fetchNotes()
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const items = useMemo<Item[]>(() => {
    const kw = query.trim().toLowerCase();
    const result: Item[] = [];

    const notes = (data ?? []).filter((n) => {
      if (!kw) return true;
      return (
        n.title.toLowerCase().includes(kw) ||
        (n.summary ?? '').toLowerCase().includes(kw) ||
        (n.tag ?? '').toLowerCase().includes(kw)
      );
    });
    notes.slice(0, kw ? 12 : 6).forEach((n) => {
      result.push({
        key: `note-${n.id}`,
        kind: 'note',
        title: n.title,
        hint: n.summary ?? undefined,
        flag: n.recommend === ENCRYPTED ? 'enc' : n.recommend === RECOMMEND ? 'rec' : undefined,
        run: () => navigate(`/note/${n.id}`)
      });
    });

    const actions: Item[] = [];
    if (isAuthed) {
      actions.push({
        key: 'action-new',
        kind: 'action',
        title: '新建笔记',
        run: () => navigate('/edit')
      });
    }
    actions.push({
      key: 'action-theme',
      kind: 'action',
      title: theme === 'light' ? '切换到深色主题' : '切换到浅色主题',
      run: toggle
    });
    if (!isAuthed) {
      actions.push({
        key: 'action-login',
        kind: 'action',
        title: '管理员登录',
        run: () => navigate('/login')
      });
    }
    // 有关键字时动作也参与过滤
    actions.forEach((a) => {
      if (!kw || a.title.toLowerCase().includes(kw)) result.push(a);
    });

    return result;
  }, [data, query, isAuthed, theme, toggle, navigate]);

  // 查询变化时重置选中项
  useEffect(() => {
    setIndex(0);
  }, [query]);

  // 选中项滚入可视区
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  const runItem = (item: Item) => {
    item.run();
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[index]) runItem(items[index]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="搜索与命令"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="palette-input-wrap">
          <svg viewBox="0 0 16 16" className="palette-input-icon" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            className="palette-input"
            placeholder="搜索笔记，或输入命令…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd className="palette-esc">Esc</kbd>
        </div>

        <ul className="palette-list" ref={listRef} role="listbox">
          {items.length === 0 && <li className="palette-empty">没有匹配的结果</li>}
          {items.map((item, i) => (
            <li
              key={item.key}
              role="option"
              aria-selected={i === index}
              data-selected={i === index}
              className={`palette-item${i === index ? ' selected' : ''}`}
              onMouseEnter={() => setIndex(i)}
              onClick={() => runItem(item)}
            >
              <span className={`palette-kind palette-kind-${item.kind}`} aria-hidden="true">
                {item.kind === 'note' ? (
                  <svg viewBox="0 0 16 16" width="13" height="13">
                    <path d="M4 2h6l3 3v9H4z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                    <path d="M10 2v3h3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 16 16" width="13" height="13">
                    <path d="M9 2L4 9h3l-1 5 6-8H9z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="palette-title">
                {item.flag === 'enc' && <span className="palette-flag">🔒</span>}
                {item.flag === 'rec' && <span className="palette-flag palette-flag-rec">★</span>}
                {item.title}
              </span>
              {item.hint && <span className="palette-hint">{item.hint}</span>}
            </li>
          ))}
        </ul>

        <div className="palette-foot">
          <span><kbd>↑↓</kbd> 选择</span>
          <span><kbd>↵</kbd> 打开</span>
        </div>
      </div>
    </div>
  );
}
