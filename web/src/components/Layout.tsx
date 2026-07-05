import { Link, Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom';
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { useTheme } from '../hooks/useTheme';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { triggerUpdate } from '../api/notes';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmDialog';
import ErrorBoundary from './ErrorBoundary';
import Sidebar from './Sidebar';
import './layout.css';

const CommandPalette = lazy(() => import('./CommandPalette'));

function Fallback() {
  return (
    <div className="center-box">
      <span className="spin" />
    </div>
  );
}

// 工作台布局：常驻侧栏（桌面）/ 抽屉（移动端） + 内容区
export default function Layout() {
  const { isAuthed, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const isMobile = useMediaQuery('(max-width: 900px)');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // 当前阅读中的笔记 id（用于树高亮）
  const noteMatch = useMatch('/note/:id');
  const activeId = noteMatch ? Number(noteMatch.params.id) : null;

  // 路由切换时自动收起移动端抽屉与搜索页，并回到页面顶部。
  // 不用 ScrollRestoration：返回导航时它会恢复历史滚动深度，恢复瞬间
  // iOS Safari 重新展开工具栏并给信号栏垫灰底；统一回顶则始终干净
  useEffect(() => {
    setDrawerOpen(false);
    setPaletteOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // 抽屉/搜索是文档流全屏视图而非 fixed 覆盖层（fixed 全屏层会让 iOS Safari 给信号栏垫灰底）。
  // 打开时记住滚动位置并回顶；原路关闭时恢复，跳转新页面时已在顶部无需处理（详情页另有回顶）
  const overlayOpen = isMobile && (drawerOpen || paletteOpen);
  const savedScroll = useRef(0);
  const openedAtPath = useRef('');
  useEffect(() => {
    if (!isMobile) return;
    if (overlayOpen) {
      savedScroll.current = window.scrollY;
      openedAtPath.current = location.pathname;
      window.scrollTo(0, 0);
    } else if (location.pathname === openedAtPath.current) {
      window.scrollTo(0, savedScroll.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayOpen, isMobile]);

  // 全局快捷键：Cmd/Ctrl+K 命令面板
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const updateMutation = useMutation({
    mutationFn: triggerUpdate,
    onSuccess: (res) => toast(res.message, 'success'),
    onError: (err: Error) => toast(err.message, 'error')
  });

  const onUpdate = useCallback(async () => {
    const ok = await confirm({
      title: '触发远程更新？',
      message: '将拉取最新代码并重建服务，期间站点可能短暂不可用。',
      confirmText: '开始更新'
    });
    if (ok) updateMutation.mutate();
  }, [confirm, updateMutation]);

  const onSignOut = useCallback(() => {
    signOut();
    toast('已退出登录', 'info');
  }, [signOut, toast]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const sidebar = <Sidebar activeId={activeId} onNavigate={closeDrawer} />;

  return (
    <div className="workbench">
      <header className="topbar">
        <div className="topbar-left">
          {isMobile && (
            <button
              className="icon-btn"
              onClick={() => setDrawerOpen(true)}
              aria-label="打开笔记列表"
            >
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <Link to="/" className="brand">
            <span className="brand-mark" aria-hidden="true">N</span>
            <span className="brand-text">Note</span>
          </Link>
        </div>
        <nav className="topbar-actions">
          <button className="search-trigger" onClick={() => setPaletteOpen(true)} aria-label="搜索（Cmd+K）">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span className="search-trigger-text">搜索</span>
            <kbd className="search-trigger-kbd">⌘K</kbd>
          </button>
          <button className="icon-btn" onClick={toggle} title="切换主题" aria-label="切换主题">
            {theme === 'light' ? (
              <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
                <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
                <circle cx="8" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
                <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            )}
          </button>
          {isAuthed ? (
            <>
              <button className="btn btn-primary" onClick={() => navigate('/edit')}>
                <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                {!isMobile && '新建'}
              </button>
              {!isMobile && (
                <>
                  <button
                    className="btn"
                    onClick={onUpdate}
                    disabled={updateMutation.isPending}
                    title="拉取最新代码并重建"
                  >
                    {updateMutation.isPending ? '触发中…' : '更新'}
                  </button>
                  <button className="btn" onClick={onSignOut}>
                    退出
                  </button>
                </>
              )}
            </>
          ) : (
            <Link to="/login" className="btn">
              登录
            </Link>
          )}
        </nav>
      </header>

      <div className="workbench-body">
        {!isMobile && <aside className="workbench-sidebar">{sidebar}</aside>}

        {isMobile && drawerOpen && (
          <aside className="workbench-drawer" aria-label="笔记列表">
            <div className="drawer-head">
              <span className="drawer-title">全部笔记</span>
              <button className="icon-btn" onClick={closeDrawer} aria-label="关闭列表">
                ✕
              </button>
            </div>
            {sidebar}
            {isAuthed && (
              <div className="drawer-foot">
                <button
                  className="btn"
                  onClick={onUpdate}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? '触发中…' : '更新服务'}
                </button>
                <button className="btn" onClick={onSignOut}>
                  退出登录
                </button>
              </div>
            )}
          </aside>
        )}

        <main className="workbench-main" hidden={overlayOpen}>
          <ErrorBoundary>
            <Suspense fallback={<Fallback />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {paletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette onClose={() => setPaletteOpen(false)} />
        </Suspense>
      )}

    </div>
  );
}
