import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';

// 详情（含 Markdown 渲染）与编辑（含 Markdown 编辑器）按需加载，减小首屏体积
const Detail = lazy(() => import('./pages/Detail'));
const Editor = lazy(() => import('./pages/Editor'));
// 公开分享页：独立于工作台布局，免登录只读
const Share = lazy(() => import('./pages/Share'));

// 数据路由：支持 useBlocker（编辑器未保存离开拦截）
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'note/:id', element: <Detail /> },
      {
        path: 'edit',
        element: (
          <ProtectedRoute>
            <Editor />
          </ProtectedRoute>
        )
      },
      {
        path: 'edit/:id',
        element: (
          <ProtectedRoute>
            <Editor />
          </ProtectedRoute>
        )
      },
      { path: 'login', element: <Login /> },
      { path: '*', element: <Navigate to="/" replace /> }
    ]
  },
  {
    path: '/s/:token',
    element: (
      <Suspense fallback={<div className="center-box"><span className="spin" /></div>}>
        <Share />
      </Suspense>
    )
  }
]);
