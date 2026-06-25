import { useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { fetchNotes, unlock as unlockApi } from '../api/notes';
import { getUnlockToken, setUnlockToken, clearUnlockToken } from '../api/client';
import { buildTree, filterTree } from '../utils/tree';
import { ENCRYPTED } from '../types';
import NoteTree from '../components/NoteTree';
import './list.css';

export default function List() {
  const [keyword, setKeyword] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [unlocked, setUnlocked] = useState(() => !!getUnlockToken());
  const [showUnlock, setShowUnlock] = useState(false);
  const [password, setPassword] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['notes'],
    queryFn: () => fetchNotes()
  });

  const unlockMutation = useMutation({
    mutationFn: () => unlockApi(password),
    onSuccess: (res) => {
      setUnlockToken(res.token);
      setUnlocked(true);
      setShowUnlock(false);
      setPassword('');
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    }
  });

  const relock = () => {
    clearUnlockToken();
    setUnlocked(false);
    queryClient.invalidateQueries({ queryKey: ['notes'] });
  };

  const hasEncrypted = useMemo(
    () => (data ?? []).some((n) => n.recommend === ENCRYPTED),
    [data]
  );

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
        {hasEncrypted &&
          (unlocked ? (
            <button className="btn" onClick={relock} title="重新锁定加密笔记">
              🔓 已解锁
            </button>
          ) : (
            <button className="btn" onClick={() => setShowUnlock((v) => !v)}>
              🔒 解锁
            </button>
          ))}
      </div>

      {showUnlock && !unlocked && (
        <form
          className="unlock-bar"
          onSubmit={(e) => {
            e.preventDefault();
            if (password) unlockMutation.mutate();
          }}
        >
          <input
            className="input"
            type="password"
            placeholder="输入管理员密码解锁加密笔记"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <button className="btn btn-primary" disabled={unlockMutation.isPending}>
            {unlockMutation.isPending ? '验证中…' : '解锁'}
          </button>
          {unlockMutation.isError && (
            <span className="unlock-error">{(unlockMutation.error as Error).message}</span>
          )}
        </form>
      )}

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

      {!isLoading && tree.length > 0 && <NoteTree nodes={tree} onTagClick={setActiveTag} />}
    </div>
  );
}
