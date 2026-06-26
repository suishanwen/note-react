import { useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';
const THEME_KEY = 'note_theme';

function getInitial(): Theme {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// 主题状态：读写 localStorage 并同步到 <html data-theme>
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitial);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-color-mode', theme);
    localStorage.setItem(THEME_KEY, theme);
    // 透明状态栏让滚动内容可以延伸到屏幕顶部
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', 'transparent');
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  }, []);

  return { theme, toggle };
}
