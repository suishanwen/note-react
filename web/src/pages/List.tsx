import { useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { fetchNotes, setNoteParent } from '../api/notes';
import { useAuth } from '../auth';
import { buildTree, filterTree } from '../utils/tree';
import NoteTree from '../components/NoteTree';
import './list.css';

export default function List() {
  const [keyword, setKeyword] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const queryClient = useQueryClient();
  const { isAuthed } = useAuth();

  // 列表随登录态变化重新拉取：登录后才返回加密笔记完整内容
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['notes', isAuthed],
    queryFn: () => fetchNotes()
  });

  // 拖拽改层级：登录后可用，成功后刷新列表
  const moveMutation = useMutation({
    mutationFn: ({ id, parent }: { id: number; parent: number }) => setNoteParent(id, parent),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] })
  });

  // 拖拽仅在无搜索/筛选时启用，避免在过滤视图里改结构产生困惑
  const canDrag = isAuthed && !keyword.trim() && !activeTag;
  // 搜索/筛选时默认展开，以便看到命中的子节点；平时默认收起
  const isFiltering = !!keyword.trim() || !!activeTag;

  // 关键字、标签过滤后组装成树，保留命中节点的祖先链
  const tree = useMemo(() => {
    const roots = buildTree(data ?? []);
    const kw = keyword.trim().toLowerCase();
    if (!kw && !activeTag) return roots;
    return filterTree(roots, (n) => {
      const matchKw =
        !kw ||
        n.title.toLowerCase().includes(kw) ||
        (n.summary ?? '').toLowerCase().includes(kw);
      const matchTag = !activeTag || (n.tag ?? '').split('|').includes(activeTag);
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
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-row" />
          ))}
        </div>
      )}

      {isError && <div className="center-box">加载失败：{(error as Error).message}</div>}

      {!isLoading && !isError && tree.length === 0 && (
        <div className="center-box">暂无笔记</div>
      )}

      {canDrag && tree.length > 0 && (
        <p className="list-hint">已登录：拖拽笔记可调整父子层级</p>
      )}

      {!isLoading && tree.length > 0 && (
        <NoteTree
          nodes={tree}
          draggable={canDrag}
          defaultExpanded={isFiltering}
          onTagClick={setActiveTag}
          onMove={(id, parent) => moveMutation.mutate({ id, parent })}
        />
      )}
    </div>
  );
}
