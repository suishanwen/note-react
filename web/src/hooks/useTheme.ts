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
    // 状态栏颜色跟随主题背景，消除白/黑边（transparent 无效会被 iOS 当白色）
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#14151a' : '#f6f5f1');
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  }, []);

  return { theme, toggle };
}
