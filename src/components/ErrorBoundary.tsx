import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error in app tree:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center text-ink">
        <div className="text-5xl" aria-hidden="true">
          🚙💦
        </div>
        <h1 className="text-lg font-black">予期しないエラーが発生しました</h1>
        <p className="max-w-xs text-sm text-ink-muted">
          お手数ですが、再読み込みをお試しください。データは端末内に保存されているため失われません。
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-white"
        >
          再読み込みする
        </button>
      </div>
    );
  }
}
