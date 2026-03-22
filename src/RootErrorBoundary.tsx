import { Component, type ErrorInfo, type ReactNode } from 'react';

type State = { message: string | null };

export class RootErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { message: null };

  static getDerivedStateFromError(error: Error): State {
    return { message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (this.state.message) {
      return (
        <div
          style={{
            padding: '2rem',
            maxWidth: 560,
            margin: '0 auto',
            fontFamily: 'system-ui, sans-serif',
            lineHeight: 1.5,
          }}
        >
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Не удалось запустить приложение</h1>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            Откройте консоль браузера (F12). На Vercel задайте переменные{' '}
            <code style={{ background: '#eee', padding: '0.1em 0.35em', borderRadius: 4 }}>VITE_SUPABASE_URL</code> и{' '}
            <code style={{ background: '#eee', padding: '0.1em 0.35em', borderRadius: 4 }}>VITE_SUPABASE_PUBLISHABLE_KEY</code>{' '}
            и выполните новый деплой (они подставляются при сборке).
          </p>
          <pre
            style={{
              background: '#f5f5f5',
              padding: '1rem',
              overflow: 'auto',
              fontSize: '0.8rem',
              borderRadius: 8,
            }}
          >
            {this.state.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
