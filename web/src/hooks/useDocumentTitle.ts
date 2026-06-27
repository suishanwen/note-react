import { useEffect } from 'react';

const BASE = 'Note';

// 设置页面标题（笔记标题/页面名），卸载时还原为站点名
export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : BASE;
    return () => {
      document.title = BASE;
    };
  }, [title]);
}
