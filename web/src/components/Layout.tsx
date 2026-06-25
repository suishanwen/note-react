import { Link, useNavigate } from 'react-router-dom';
import { useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { useTheme } from '../hooks/useTheme';
import { triggerUpdate } from '../api/notes';
import Footer from './Footer';
import './layout.css';

// 全局布局：顶栏 + 内容 + 页脚
export default function Layout({ children }: { children: ReactNode }) {
  const { isAuthed, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [tip, setTip] = useState('');

  const updateMutation = useMutation({
    mutationFn: triggerUpdate,
    onSuccess: (res) => setTip(res.message),
    onError: (err: Error) => setTip(err.message)
  });

  const onUpdate = () => {
    if (window.confirm('确认触发远程更新？将拉取最新代码并重建服务。')) {
      updateMutation.mutate();
    }
  };

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
                <button
                  className="btn"
                  onClick={onUpdate}
                  disabled={updateMutation.isPending}
                  title="拉取最新代码并重建"
                >
                  {updateMutation.isPending ? '触发中…' : '更新'}
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
      {tip && (
        <div className="topbar-tip container" onClick={() => setTip('')}>
          {tip}
        </div>
      )}
      <main className="content container">{children}</main>
      <Footer />
    </div>
  );
}
