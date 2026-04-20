import React from 'react';

/**
 * ErrorBoundary - Graceful fallback UI when any child component throws.
 * Prevents the whole app from going blank on unexpected errors.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') window.location.href = '/';
  };

  handleReload = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const lang = (typeof navigator !== 'undefined' && navigator.language) || 'ar';
    const isAr = lang.toLowerCase().startsWith('ar');

    return (
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0A0605 0%, #1a0e08 100%)',
          color: '#F5E6C8',
          fontFamily: 'Tajawal, Outfit, system-ui, sans-serif',
          padding: '2rem',
        }}
      >
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem', color: '#D4AF37' }}>
            {isAr ? 'حدث خطأ غير متوقع' : 'Something went wrong'}
          </h1>
          <p style={{ opacity: 0.75, marginBottom: '2rem', lineHeight: 1.7 }}>
            {isAr
              ? 'نعتذر عن هذا الخلل. يمكنك إعادة تحميل الصفحة أو العودة إلى الصفحة الرئيسية.'
              : "We're sorry for the inconvenience. You can reload the page or go back home."}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={this.handleReload}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#D4AF37',
                color: '#0A0605',
                border: 'none',
                borderRadius: '999px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.95rem',
              }}
            >
              {isAr ? 'إعادة تحميل' : 'Reload'}
            </button>
            <button
              onClick={this.handleReset}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                color: '#D4AF37',
                border: '1px solid #D4AF37',
                borderRadius: '999px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.95rem',
              }}
            >
              {isAr ? 'الصفحة الرئيسية' : 'Go Home'}
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '2rem', textAlign: 'left', opacity: 0.6, fontSize: '0.75rem' }}>
              <summary style={{ cursor: 'pointer' }}>Error details</summary>
              <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: 200 }}>
                {String(this.state.error?.stack || this.state.error)}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
