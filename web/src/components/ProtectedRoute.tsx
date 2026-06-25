import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../auth';

// 受保护路由：未登录跳转登录页并记录来源
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthed } = useAuth();
  const location = useLocation();
  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
