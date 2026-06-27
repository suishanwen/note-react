import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// 路由级错误边界：单个页面渲染抛错时降级为可恢复卡片，避免整站白屏
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary#componentDidCatch 渲染异常 %s', error.message);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="center-box">
          <h2>页面出错了</h2>
          <p style={{ color: 'var(--text-muted)' }}>{this.state.error.message}</p>
          <a href="/" className="btn" onClick={this.reset}>
            返回首页
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}
