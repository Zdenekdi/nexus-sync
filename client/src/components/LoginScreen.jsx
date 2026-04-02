import React, { useState } from 'react';
import { Zap, User, Lock, Building, UserPlus, ChevronLeft, Globe, ArrowRight, ShieldCheck, Mail, Eye, EyeOff } from 'lucide-react';

import { useNexus } from '../context/NexusContext';

const LoginScreen = () => {
  const { 
    onLogin, 
    onRegisterAgency, 
    onRegisterUser, 
    onResetRequest, 
    setShowLanding, 
    operators, 
    lang, 
    setLang, 
    t, 
    isMobile 
  } = useNexus();

  const onBackToLanding = () => setShowLanding(true);
  const [mode, setMode] = useState('login'); // login, register_agency, register_user, reset
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [selectedRole, setSelectedRole] = useState('Operator');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await onLogin(email, password);
      } else if (mode === 'register_agency') {
        const data = { agencyName, fullName, email, password };
        if (onRegisterAgency) await onRegisterAgency(data);
        setMessage(t('registrationSuccess'));
        setTimeout(() => setMode('login'), 2000);
      } else if (mode === 'register_user') {
        const data = { fullName, email, password, inviteCode, roleName: selectedRole };
        if (onRegisterUser) await onRegisterUser(data);
        setMessage(t('registrationSuccess'));
        setTimeout(() => setMode('login'), 2000);
      } else if (mode === 'reset') {
        if (onResetRequest) await onResetRequest(email);
        setMessage(t('resetSent'));
        setTimeout(() => setMode('login'), 3000);
      }
    } catch (err) {
      setError(err.message || t('loginError'));
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => (
    <div style={{ textAlign: 'center', marginBottom: isMobile ? '1.5rem' : '2.5rem' }}>
      <div style={{ position: 'relative', width: isMobile ? '60px' : '80px', height: isMobile ? '60px' : '80px', margin: '0 auto 1.25rem' }}>
        <div style={{ position: 'absolute', inset: -12, background: 'var(--accent-color)', opacity: 0.2, filter: 'blur(20px)', borderRadius: '50%' }}></div>
        <img src="/nexus_icon.png" alt="Nexus" style={{ position: 'relative', width: '100%', height: '100%', borderRadius: isMobile ? '18px' : '22px', boxShadow: '0 10px 30px var(--accent-glow)' }} />
      </div>
      <h1 style={{ fontSize: isMobile ? '1.8rem' : '2.4rem', fontWeight: '900', letterSpacing: '-0.02em', marginBottom: '0.25rem', background: 'linear-gradient(to bottom, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>NEXUS SYSTEMS</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '500', letterSpacing: '0.05em' }}>NEXUS SYSTEMS S.R.O. • PREMIUM ENGINE</p>
    </div>
  );

  const topActionLabel = mode === 'login'
    ? (lang === 'cz' ? 'Zpět na představení' : 'Back to Presentation')
    : t('backToLogin');

  const handleTopAction = () => {
    if (mode === 'login') {
      onBackToLanding();
      return;
    }
    setMode('login');
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#0a0b14', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'center', padding: isMobile ? 'calc(max(1rem, env(safe-area-inset-top)) + 0.5rem) 0.9rem 1.5rem' : '1.5rem', position: 'relative', overflowX: 'hidden', overflowY: 'auto' }}>
      {/* Cinematic Background Elements */}
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', filter: 'blur(80px)' }}></div>
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', filter: 'blur(100px)' }}></div>
      
      <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '480px', padding: isMobile ? '1.25rem' : '3.5rem', position: 'relative', zIndex: 1, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', maxHeight: isMobile ? 'calc(100dvh - max(1rem, env(safe-area-inset-top)) - 2.5rem)' : 'none', overflowY: isMobile ? 'auto' : 'visible' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: isMobile ? '1rem' : '0.75rem', paddingRight: isMobile ? 'calc(0.5rem + env(safe-area-inset-right))' : '0', paddingLeft: isMobile ? 'calc(0.5rem + env(safe-area-inset-left))' : '0' }}>
          <button onClick={handleTopAction} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: isMobile ? '0.8rem' : '0.85rem', fontWeight: '600', cursor: 'pointer', transition: 'color 0.2s', padding: 0, textAlign: 'left' }}>
            <ChevronLeft size={16} /> {topActionLabel}
          </button>
        </div>

        {renderHeader()}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.25rem' }}>

          {mode === 'register_agency' && (
            <div className="fade-in">
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>{t('agencyNameLabel').toUpperCase()}</label>
              <div style={{ position: 'relative' }}>
                <Building size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input type="text" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} placeholder="e.g. Nexus Global" required className="glass-input" style={{ width: '100%', paddingLeft: '3rem' }} />
              </div>
            </div>
          )}

          {(mode === 'register_agency' || mode === 'register_user') && (
            <div className="fade-in">
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>{t('fullNameLabel').toUpperCase()}</label>
              <div style={{ position: 'relative' }}>
                <User size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required className="glass-input" style={{ width: '100%', paddingLeft: '3rem' }} />
              </div>
            </div>
          )}

          <div className="fade-in">
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>{t('emailLabel').toUpperCase()}</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required className="glass-input" style={{ width: '100%', paddingLeft: '3rem' }} />
            </div>
          </div>

          {mode !== 'reset' && (
            <div className="fade-in">
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>{t('passwordLabel').toUpperCase()}</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  required 
                  className="glass-input" 
                  style={{ width: '100%', paddingLeft: '3rem', paddingRight: '3rem' }} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          {mode === 'register_user' && (
            <div className="fade-in">
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>{t('inviteCodeLabel').toUpperCase()}</label>
              <div style={{ position: 'relative' }}>
                <ShieldCheck size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="NEXUS-XXXX-XXXX" required className="glass-input" style={{ width: '100%', paddingLeft: '3rem' }} />
              </div>
            </div>
          )}

          {mode === 'register_user' && (
            <div className="fade-in">
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>{lang === 'cz' ? 'ROLE' : 'ROLE'}</label>
              <select
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value)}
                className="glass-input"
                style={{ width: '100%', background: 'rgba(0,0,0,0.5)', cursor: 'pointer' }}
              >
                <option value="Operator">{lang === 'cz' ? 'Operátorka' : 'Operator'}</option>
                <option value="Model">{lang === 'cz' ? 'Modelka' : 'Model'}</option>
              </select>
            </div>
          )}

          {error && <div style={{ color: 'var(--error-color)', fontSize: '0.85rem', fontWeight: '700', textAlign: 'center', background: 'rgba(239,68,68,0.1)', padding: '0.75rem', borderRadius: '8px' }}>{error}</div>}
          {message && <div style={{ color: 'var(--accent-color)', fontSize: '0.85rem', fontWeight: '700', textAlign: 'center', background: 'rgba(59,130,246,0.1)', padding: '0.75rem', borderRadius: '8px' }}>{message}</div>}

          <button type="submit" disabled={loading} className="action-btn" style={{ background: 'var(--accent-color)', color: 'white', padding: '1.1rem', fontSize: '1rem', fontWeight: '800', boxShadow: '0 10px 25px var(--accent-glow)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            {loading ? <div className="spinner"></div> : (
              <>
                {mode === 'login' && t('loginButton')}
                {mode === 'register_agency' && t('registerButton')}
                {mode === 'register_user' && t('registerButton')}
                {(mode === 'login' || mode === 'register_agency' || mode === 'register_user') && <ArrowRight size={18} />}
                {mode === 'reset' && t('resetRequestButton')}
              </>
            )}
          </button>

          {mode === 'login' && (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setMode('reset')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '500' }}>{t('forgotPassword')}</button>
              <div style={{ height: '1px', background: 'var(--card-border)', margin: '0.5rem 0' }}></div>
              <div style={{ display: 'flex', gap: isMobile ? '0.75rem' : '1rem', justifyContent: 'center', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
                <button type="button" onClick={() => setMode('register_agency')} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', flexWrap: 'wrap', textAlign: 'center' }}><Building size={14}/> {t('registerAgency')}</button>
                <div style={{ width: isMobile ? '100%' : '1px', height: isMobile ? '1px' : 'auto', background: 'var(--card-border)', maxWidth: isMobile ? '180px' : 'none' }}></div>
                <button type="button" onClick={() => setMode('register_user')} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', flexWrap: 'wrap', textAlign: 'center' }}><UserPlus size={14}/> {t('registerUser')}</button>
              </div>
            </div>
          )}
        </form>

        <div style={{ marginTop: isMobile ? '1.5rem' : '2.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: isMobile ? '6px 6px calc(6px + env(safe-area-inset-bottom))' : '6px', borderRadius: '12px', border: '1px solid var(--card-border)', width: 'fit-content', margin: `${isMobile ? '1.5rem' : '2.5rem'} auto calc(${isMobile ? '1.5rem' : '2.5rem'} + env(safe-area-inset-bottom))` }}>
          <button onClick={() => setLang('cz')} style={{ padding: '8px 16px', border: 'none', background: lang === 'cz' ? 'var(--accent-color)' : 'transparent', color: 'white', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>CZ</button>
          <button onClick={() => setLang('en')} style={{ padding: '8px 16px', border: 'none', background: lang === 'en' ? 'var(--accent-color)' : 'transparent', color: 'white', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>EN</button>
        </div>
      </div>

      <style>{`
        .glass-input {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--card-border);
          padding: 1.1rem;
          border-radius: 14px;
          color: white;
          font-size: 0.95rem;
          transition: all 0.2s;
        }
        .glass-input:focus {
          outline: none;
          background: rgba(255,255,255,0.06);
          border-color: var(--accent-color);
          box-shadow: 0 0 15px rgba(59,130,246,0.15);
        }
        .spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }
        @supports (padding: max(0px)) {
          @media (max-width: 640px) {
            .glass-card {
              margin: 0 auto;
            }
          }
        }
      `}</style>
    </div>
  );
};

export default LoginScreen;
