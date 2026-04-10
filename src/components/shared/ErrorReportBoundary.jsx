import React from 'react';
import { card, btnG } from '../../constants/styles.js';

class ErrorReportBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error('[Dashboard Error]', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
          <div style={{ ...card, maxWidth: '500px', textAlign: 'center', borderTop: '4px solid #BA0517' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📉</div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#181818', margin: '0 0 12px' }}>Something went wrong</h2>
            <p style={{ color: '#706E6B', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
              We've encountered an unexpected error while loading this component. Our team has been notified.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button 
                onClick={() => window.location.reload()} 
                style={{ ...btnG, background: '#0176D3', color: '#fff', padding: '10px 20px', fontSize: '14px' }}
              >
                🔄 Reload Page
              </button>
              <button 
                onClick={() => this.setState({ hasError: false })} 
                style={{ ...btnG, padding: '10px 20px', fontSize: '14px' }}
              >
                Try Again
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details style={{ marginTop: '24px', textAlign: 'left', background: '#F8FAFC', padding: '12px', borderRadius: '8px', fontSize: '12px' }}>
                <summary style={{ cursor: 'pointer', color: '#BA0517', fontWeight: 700 }}>View Error Details</summary>
                <pre style={{ overflowX: 'auto', marginTop: '8px' }}>
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorReportBoundary;
