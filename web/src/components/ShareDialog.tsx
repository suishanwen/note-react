import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getShare, createShare, deleteShare } from '../api/notes';
import { useToast } from './Toast';
import { formatDateTime } from '../utils/date';
import type { ShareDuration } from '../types';
import './shareDialog.css';

const DURATIONS: { value: ShareDuration; label: string }[] = [
  { value: 'day', label: '24 小时' },
  { value: 'week', label: '7 天' },
  { value: 'forever', label: '永久' }
];

// 单篇笔记分享管理弹窗：生成/复制/重设有效期/取消
export default function ShareDialog({ noteId, onClose }: { noteId: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [duration, setDuration] = useState<ShareDuration>('day');

  const { data: share, isLoading } = useQuery({
    queryKey: ['share', noteId],
    queryFn: () => getShare(noteId),
    retry: false
  });

  // Esc 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['share', noteId] });

  const createMutation = useMutation({
    mutationFn: () => createShare(noteId, duration),
    onSuccess: () => {
      invalidate();
      toast('分享链接已生成', 'success');
    },
    onError: (err: Error) => toast(err.message, 'error')
  });

  const removeMutation = useMutation({
    mutationFn: () => deleteShare(noteId),
    onSuccess: () => {
      invalidate();
      toast('已取消分享', 'info');
    },
    onError: (err: Error) => toast(err.message, 'error')
  });

  const shareUrl = share ? `${window.location.origin}/s/${share.token}` : '';
  const busy = createMutation.isPending || removeMutation.isPending;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast('链接已复制', 'success');
    } catch {
      toast('复制失败，请手动复制', 'error');
    }
  };

  return (
    <div className="share-backdrop" onClick={onClose}>
      <div
        className="share-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="分享文档"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="share-title">分享文档</h2>

        {isLoading ? (
          <p className="share-hint">加载中…</p>
        ) : share ? (
          <>
            <div className="share-link-row">
              <input className="input share-link" value={shareUrl} readOnly onFocus={(e) => e.target.select()} />
              <button className="btn btn-primary" onClick={onCopy}>
                复制
              </button>
            </div>
            <p className="share-hint">
              {share.expireTime ? `有效期至 ${formatDateTime(share.expireTime)}` : '永久有效'}
            </p>

            <div className="share-regen">
              <label className="share-field">
                <span>重设有效期</span>
                <select
                  className="input"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value as ShareDuration)}
                >
                  {DURATIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn" disabled={busy} onClick={() => createMutation.mutate()}>
                重新生成
              </button>
            </div>

            <div className="share-actions">
              <button className="btn btn-danger" disabled={busy} onClick={() => removeMutation.mutate()}>
                取消分享
              </button>
              <button className="btn" onClick={onClose}>
                关闭
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="share-hint">生成一个免登录只读链接，任何人都可通过它查看本文档。</p>
            <label className="share-field">
              <span>有效期</span>
              <select
                className="input"
                value={duration}
                onChange={(e) => setDuration(e.target.value as ShareDuration)}
              >
                {DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="share-actions">
              <button className="btn" onClick={onClose}>
                取消
              </button>
              <button className="btn btn-primary" disabled={busy} onClick={() => createMutation.mutate()}>
                生成分享链接
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
