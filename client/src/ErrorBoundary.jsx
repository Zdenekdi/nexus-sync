import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, _err: null };
  }
  static getDerivedStateFromError(_err) {
    return { hasError: true, _err };
  }
  componentDidCatch(_err, errorInfo) {
    console.error("Critical Runtime Error:", _err, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ height: '100vh', width: '100vw', background: '#05070a', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', overflow: 'auto' }}>
          <div style={{ width: '80px', height: '80px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', border: '1px solid #ef4444' }}>
            <AlertTriangle color="#ef4444" size={40} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '0.5rem', color: '#ef4444' }}>Kritická chyba renderu</h1>
          
          <div style={{ background: '#111', padding: '15px', borderRadius: '12px', textAlign: 'left', width: '100%', maxWidth: '600px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.5rem' }}>
            <p style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '10px', fontSize: '0.9rem' }}>
              {this.state._err?.toString()}
            </p>
            <pre style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'pre-wrap', maxHeight: '300px', overflow: 'auto' }}>
              {this.state._err?.stack}
            </pre>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => window.location.href = '/'} style={{ background: '#3b82f6', color: 'white', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>Zkusit znovu</button>
            <button onClick={() => window.location.reload()} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>Hard Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
