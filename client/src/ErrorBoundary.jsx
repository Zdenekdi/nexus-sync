import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Critical Runtime Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ height: '100vh', width: '100vw', background: '#05070a', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem', border: '1px solid #ef4444' }}>
            <AlertTriangle color="#ef4444" size={40} />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '1rem' }}>Sakra, něco se pokazilo!</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: '500px', lineHeight: '1.6', marginBottom: '2rem' }}>
            Aplikace narazila na chybu, kterou nešlo obejít. Klikni na tlačítko níže pro restartování, nebo nahlas chybu na GitHub.
          </p>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', width: '100%', maxWidth: '600px', textAlign: 'left', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.1)', overflowX: 'auto' }}>
            <code style={{ color: '#f87171', fontSize: '0.9rem' }}>{this.state.error?.toString()}</code>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => window.location.href = '/'} style={{ background: '#3b82f6', color: 'white', padding: '1rem 2rem', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}>Restartovat aplikaci</button>
            <button onClick={() => window.open('https://github.com/Zdenekdi/nexus-sync/issues/new', '_blank')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '1rem 2rem', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>Nahlásit na GitHub</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
