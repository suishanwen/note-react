import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { login } from '../api/notes';
import { useAuth } from '../auth';
import './login.css';

interface LocationState {
  from?: string;
}

export default function Login() {
  const [password, setPassword] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState)?.from || '/';

  const loginMutation = useMutation({
    mutationFn: () => login(password),
    onSuccess: (res) => {
      signIn(res.token);
      navigate(from, { replace: true });
    }
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) loginMutation.mutate();
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <h1 className="login-title">管理员登录</h1>
        <input
          className="input"
          type="password"
          placeholder="输入管理员密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {loginMutation.isError && (
          <div className="login-error">{(loginMutation.error as Error).message}</div>
        )}
        <button className="btn btn-primary login-submit" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? '登录中…' : '登录'}
        </button>
      </form>
    </div>
  );
}
