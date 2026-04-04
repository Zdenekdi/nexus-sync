import React, { useState } from 'react';
import { useNexus } from '../context/NexusContext';
import { 
  Lock, Mail, ArrowRight, Loader2, ShieldCheck, 
  Globe, Smartphone, Zap, CheckCircle2 
} from 'lucide-react';

const LoginScreen = () => {
  const { onLogin, t, setLang, lang } = useNexus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{
      minHeight: '100dvh',
      width: '100vw',
      background: '#040507',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      padding: '0.5rem',
      position: 'fixed'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '360px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        animation: 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* LOGO AREA - ULTRA COMPACT */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '44px',
            height: '44px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            borderRadius: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
            marginBottom: '0.5rem'
          }}>
            <Zap color="white" size={22} fill="white" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '950', color: 'white', letterSpacing: '-0.03em', margin: 0 }}>
            Nexus Hub
          </h1>
        </div>

        {/* LOGIN CARD */}
        <div className="glass-card" style={{
          padding: '1.25rem',
          borderRadius: '20px',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)'
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="input-group">
              <label style={{ fontSize: '0.65rem', fontWeight: '800', color: '#64748b', marginBottom: '0.3rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('emailLabel')}
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@agency.com"
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem 0.6rem 2.4rem',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <label style={{ fontSize: '0.65rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('passwordLabel')}
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem 0.6rem 2.4rem',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="hover-bright"
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: '900',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '0.25rem'
              }}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : (
                <>
                  {t('loginButton')}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* LANG & EXIT */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <button onClick={() => setLang('cz')} style={{ padding: '3px 10px', border: 'none', background: lang === 'cz' ? '#3b82f6' : 'transparent', color: 'white', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '800', cursor: 'pointer' }}>CZ</button>
            <button onClick={() => setLang('en')} style={{ padding: '3px 10px', border: 'none', background: lang === 'en' ? '#3b82f6' : 'transparent', color: 'white', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '800', cursor: 'pointer' }}>EN</button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .hover-bright:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .hover-bright:active { transform: translateY(0); }
      `}</style>
    </div>
  );
};

export default LoginScreen;
