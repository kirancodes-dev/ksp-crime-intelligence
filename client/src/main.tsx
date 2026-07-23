import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('KSP Crime Intelligence Portal uncaught exception:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ fontSize: '1.8rem', color: '#ef4444', marginBottom: '16px' }}>Karnataka State Police - Crime Intelligence Portal</h2>
          <p style={{ color: '#94a3b8', marginBottom: '16px', maxWidth: '600px' }}>
            A temporary component state anomaly occurred. Click below to resume your portal session immediately.
          </p>
          {this.state.error && (
            <pre style={{ backgroundColor: '#1e293b', color: '#f87171', padding: '12px 16px', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '24px', maxWidth: '700px', overflowX: 'auto', textAlign: 'left' }}>
              {this.state.error.toString()}
            </pre>
          )}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{ padding: '12px 24px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }}
            >
              Resume Station Session
            </button>
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
              style={{ padding: '12px 24px', backgroundColor: '#475569', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }}
            >
              Reset Session
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
