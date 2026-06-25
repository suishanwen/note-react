import { Link, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../auth';
import { useTheme } from '../hooks/useTheme';
import Footer from './Footer';
import './layout.css';

// 全局布局：顶栏 + 内容 + 页脚
export default function Layout({ children }: { children: ReactNode }) {
  const { isAuthed, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="layout">
      <header className="topbar">
        <div className="topbar-inner container">
          <Link to="/" className="brand">
            Note
          </Link>
          <nav className="topbar-actions">
            <button className="icon-btn" onClick={toggle} title="切换主题" aria-label="切换主题">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            {isAuthed ? (
              <>
                <button className="btn btn-primary" onClick={() => navigate('/edit')}>
                  新建
                </button>
                <button className="btn" onClick={signOut}>
                  退出
                </button>
              </>
            ) : (
              <Link to="/login" className="btn">
                登录
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="content container">{children}</main>
      <Footer />
    </div>
  );
}
