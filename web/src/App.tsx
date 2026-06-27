import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import List from './pages/List';
import Login from './pages/Login';

// 详情（含 Markdown 渲染）与编辑（含 Markdown 编辑器）按需加载，减小首屏体积
const Detail = lazy(() => import('./pages/Detail'));
const Editor = lazy(() => import('./pages/Editor'));

function Fallback() {
  return (
    <div className="center-box">
      <span className="spin" />
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <ErrorBoundary>
        <Suspense fallback={<Fallback />}>
          <Routes>
          <Route path="/" element={<List />} />
          <Route path="/note/:id" element={<Detail />} />
          <Route
            path="/edit"
            element={
              <ProtectedRoute>
                <Editor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit/:id"
            element={
              <ProtectedRoute>
                <Editor />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}
