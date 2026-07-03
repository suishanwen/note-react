import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { fetchNotes, setNoteParent } from '../api/notes';
import { useAuth } from '../auth';
import { useToast } from './Toast';
import { buildTree, filterTree, flattenTree } from '../utils/tree';
import { useMediaQuery } from '../hooks/useMediaQuery';
import NoteTree from './NoteTree';
import './sidebar.css';

const EXPAND_KEY = 'note_tree_expanded';

interface Props {
  // 当前正在阅读的笔记 id
  activeId: number | null;
  // 点击笔记后回调（移动端关闭抽屉）
  onNavigate?: () => void;
}

// 常驻侧栏：搜索 + 标签筛选 + 笔记树，树的展开状态持久化
export default function Sidebar({ activeId, onNavigate }: Props) {
  const [keyword, setKeyword] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 900px)');

  // 列表随登录态变化重新拉取：登录后才返回加密笔记完整内容
  const { data, isLoading, isError } = useQuery({
    queryKey: ['notes', isAuthed],
    queryFn: () => fetchNotes()
  });

  // 拖拽改层级：登录后可用，成功后刷新列表
  const moveMutation = useMutation({
    mutationFn: ({ id, parent }: { id: number; parent: number }) => setNoteParent(id, parent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast('已调整层级', 'success');
    },
    onError: (err: Error) => toast(err.message, 'error')
  });

  const kw = keyword.trim().toLowerCase();
  const isFiltering = !!kw || !!activeTag;
  // 拖拽仅在桌面端、登录、无搜索/筛选时启用
  const canDrag = isAuthed && !isMobile && !isFiltering;

  // 全部标签（按出现频次排序，供快速筛选）
  const allTags = useMemo(() => {
    const count = new Map<string, number>();
    (data ?? []).forEach((n) => {
      (n.tag ?? '')
        .split('|')
        .filter(Boolean)
        .forEach((t) => count.set(t, (count.get(t) ?? 0) + 1));
    });
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [data]);

  // 关键字、标签过滤后组装成树，保留命中节点的祖先链
  const tree = useMemo(() => {
    const roots = buildTree(data ?? []);
    if (!kw && !activeTag) return roots;
    return filterTree(roots, (n) => {
      const matchKw =
        !kw ||
        n.title.toLowerCase().includes(kw) ||
        (n.summary ?? '').toLowerCase().includes(kw);
      const matchTag = !activeTag || (n.tag ?? '').split('|').includes(activeTag);
      return matchKw && matchTag;
    });
  }, [data, kw, activeTag]);

  const total = data?.length ?? 0;
  const matched = useMemo(
    () => (isFiltering ? flattenTree(tree).length : total),
    [isFiltering, tree, total]
  );

  return (
    <div className="sidebar">
      <div className="sidebar-search">
        <svg className="sidebar-search-icon" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          className="sidebar-search-input"
          placeholder="搜索笔记…"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          aria-label="搜索笔记"
        />
        {keyword && (
          <button className="sidebar-search-clear" onClick={() => setKeyword('')} aria-label="清空搜索">
            ✕
          </button>
        )}
      </div>

      {allTags.length > 0 && (
        <div className="sidebar-tags">
          {allTags.slice(0, 8).map((tag) => (
            <button
              key={tag}
              className={`tag clickable${activeTag === tag ? ' tag-active' : ''}`}
              onClick={() => setActiveTag(activeTag === tag ? '' : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="sidebar-tree">
        {isLoading && (
          <div className="sidebar-skeletons">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton sidebar-skeleton-row" style={{ width: `${88 - (i % 4) * 12}%` }} />
            ))}
          </div>
        )}

        {isError && <div className="sidebar-empty">加载失败，请稍后重试</div>}

        {!isLoading && !isError && tree.length === 0 && (
          <div className="sidebar-empty">
            {isFiltering ? '没有匹配的笔记' : '还没有笔记'}
            {!isFiltering && isAuthed && (
              <button className="btn btn-primary" onClick={() => navigate('/edit')}>
                写第一篇
              </button>
            )}
          </div>
        )}

        {!isLoading && tree.length > 0 && (
          <NoteTree
            nodes={tree}
            draggable={canDrag}
            expandAll={isFiltering}
            activeId={activeId}
            storageKey={EXPAND_KEY}
            onTagClick={setActiveTag}
            onMove={(id, parent) => moveMutation.mutate({ id, parent })}
            onNavigate={onNavigate}
          />
        )}
      </div>

      <div className="sidebar-foot">
        {isFiltering ? `${matched} / ${total} 篇` : `${total} 篇笔记`}
        {canDrag && <span className="sidebar-foot-hint">拖动可调整层级</span>}
      </div>
    </div>
  );
}
