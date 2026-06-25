import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { getToken, setToken, clearToken } from './api/client';

interface AuthContextValue {
  isAuthed: boolean;
  signIn: (token: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthed, setIsAuthed] = useState(() => !!getToken());

  const signIn = useCallback((token: string) => {
    setToken(token);
    setIsAuthed(true);
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setIsAuthed(false);
  }, []);

  return <AuthContext.Provider value={{ isAuthed, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return ctx;
}
