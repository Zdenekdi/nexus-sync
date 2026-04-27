import React, { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { useNexus } from '../context/NexusContext';
import { 
  Lock, Mail, ArrowRight, Loader2, 
  Globe, Zap, CheckCircle2, User, Building2, KeyRound, Copy, Check,
  Eye, EyeOff
} from 'lucide-react';

import { API_BASE, APP_VERSION } from '../constants/config';

// --- Static Styles (Defined outside to prevent recreation overhead) ---
const STYLES = {
  page: { minHeight: '100dvh', width: '100vw', background: '#040507', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '1rem 0.5rem', position: 'fixed' },
  container: { width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '0.75rem', animation: 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)', padding: '1rem' },
  statusBadge: { background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '3px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' },
  logoBox: { width: '44px', height: '44px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)', marginBottom: '0.5rem' },
  input: { width: '100%', padding: '0.6rem 0.85rem 0.6rem 2.4rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '0.85rem', outline: 'none' },
  label: { fontSize: '0.65rem', fontWeight: '800', color: '#64748b', marginBottom: '0.3rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' },
  icon: { position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' },
  eyeToggle: { position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 0, display: 'flex' },
  submitButton: { width: '100%', padding: '0.75rem', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.25rem' }
};

// --- Memoized UI Components ---

const StatusBadge = memo(({ isCz }) => (
  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.25rem' }}>
    <div style={STYLES.statusBadge}>
      <div className="status-dot" style={{ width: '6px', height: '6px' }} />
      <span style={{ fontSize: '0.6rem', fontWeight: '900', color: '#10b981', letterSpacing: '0.05em' }}>
        {isCz ? 'SYSTÉM AKTIVNÍ' : 'SYSTEM LIVE'}
      </span>
    </div>
  </div>
));

const LogoHeader = memo(() => (
  <div style={{ textAlign: 'center' }}>
    <div style={STYLES.logoBox}>
      <Zap color="white" size={22} fill="white" />
    </div>
    <h1 style={{ fontSize: '1.5rem', fontWeight: '950', color: 'white', letterSpacing: '-0.03em', margin: 0 }}>
      Nexus Hub
    </h1>
  </div>
));

const AuthTabNavigation = memo(({ activeTab, setTab, labels }) => (
  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '3px', border: '1px solid rgba(255,255,255,0.05)' }}>
    {Object.keys(labels).map(t => (
      <button 
        key={t} 
        onClick={() => setTab(t)} 
        style={{
          flex: 1, padding: '0.5rem 0.25rem', border: 'none',
          background: (activeTab === t || (activeTab === 'join-agency-expanded' && t === 'join-agency')) ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
          color: (activeTab === t || (activeTab === 'join-agency-expanded' && t === 'join-agency')) ? '#60a5fa' : '#64748b',
          borderRadius: '10px', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer',
          transition: 'all 0.2s',
          borderBottom: (activeTab === t || (activeTab === 'join-agency-expanded' && t === 'join-agency')) ? '2px solid #3b82f6' : '2px solid transparent'
        }}
      >
        {labels[t]}
      </button>
    ))}
  </div>
));

const MemoInput = memo(({ label, icon: Icon, type, value, onChange, placeholder, showToggle, onToggle, isToggled, ...props }) => (
  <div>
    <label style={STYLES.label}>{label}</label>
    <div style={{ position: 'relative' }}>
      <Icon size={14} style={STYLES.icon} />
      <input 
        type={showToggle ? (isToggled ? 'text' : 'password') : type}
        value={value}
        onChange={_err => onChange(_err.target.value)}
        placeholder={placeholder}
        style={{ ...STYLES.input, paddingRight: showToggle ? '2.5rem' : '0.85rem' }}
        {...props}
      />
      {showToggle && (
        <button type="button" onClick={onToggle} style={STYLES.eyeToggle}>
          {isToggled ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      )}
    </div>
  </div>
));

const PasswordRequirements = memo(({ password, isCz }) => {
  if (!password) return null;
  
  const requirements = [
    { label: isCz ? 'Minimálně 8 znaků' : 'At least 8 characters', met: password.length >= 8 },
    { label: isCz ? 'Aspoň jedno velké písmeno' : 'At least one uppercase letter', met: /[A-Z]/.test(password) },
    { label: isCz ? 'Aspoň jedno číslo' : 'At least one number', met: /[0-9]/.test(password) }
  ];

  const getStrength = () => {
    const metCount = requirements.filter(r => r.met).length;
    if (metCount === 3) return { color: '#10b981', label: isCz ? 'Silné' : 'Strong', width: '100%' };
    if (metCount === 2) return { color: '#f59e0b', label: isCz ? 'Střední' : 'Medium', width: '66%' };
    return { color: '#ef4444', label: isCz ? 'Slabé' : 'Weak', width: '33%' };
  };

  const strength = getStrength();

  return (
    <div style={{ marginTop: '0.5rem', animation: 'fadeInUp 0.3s ease-out' }}>
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginBottom: '0.4rem' }}>
        <div style={{ height: '100%', width: strength.width, background: strength.color, borderRadius: '2px', transition: 'all 0.3s ease' }} />
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {requirements.map((req, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem' }}>
            <div style={{ 
              width: '4px', height: '4px', borderRadius: '50%', 
              background: req.met ? '#10b981' : '#475569',
              boxShadow: req.met ? '0 0 4px #10b981' : 'none'
            }} />
            <span style={{ 
              color: req.met ? '#10b981' : '#64748b',
              fontWeight: req.met ? '700' : '500',
              textDecoration: req.met ? 'line-through' : 'none',
              opacity: req.met ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

// --- Main Optimized Component ---

const LoginScreen = () => {
  const { onLogin, onRegisterAgency, onRegisterUser, t, lang, setJustLoggedOut, justLoggedOut, setShowLanding, showToast } = useNexus();
  const [tab, setTab] = useState('login'); 
  const [loading, setLoading] = useState(false);
  const [isMounting, setIsMounting] = useState(true);
  const [createdInviteCode, setCreatedInviteCode] = useState(null);
  const [copied, setCopied] = useState(false);
  
  // Password Visibility States
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showJoinPassword, setShowJoinPassword] = useState(false);

  // Form States (Split for better isolated updates)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regAgencyName, setRegAgencyName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [joinFullName, setJoinFullName] = useState('');
  const [joinEmail, setJoinEmail] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joinInviteCode, setJoinInviteCode] = useState('');

  const isCz = useMemo(() => lang === 'cz' || lang === 'cs', [lang]);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounting(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Auto-clear logout message after 5s
  useEffect(() => {
    if (justLoggedOut) {
      const timer = setTimeout(() => {
        setJustLoggedOut(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [justLoggedOut, setJustLoggedOut]);

  const handleLogin = async (_err) => {
    _err.preventDefault();
    if (!email || !password) {
      showToast(isCz ? 'Vyplňte všechna pole' : 'Please fill in all fields', 'error');
      return;
    }
    setLoading(true);
    try { await onLogin(email, password); } 
    catch (_err) { console.error(_err); } 
    finally { setLoading(false); }
  };

  const handleRegisterAgency = async (_err) => {
    _err.preventDefault();
    if (regPassword.length < 8) {
      showToast(isCz ? 'Heslo musí mít alespoň 8 znaků' : 'Password too short', 'error');
      return;
    }
    setLoading(true);
    try {
      const result = await onRegisterAgency({ fullName: regFullName, agencyName: regAgencyName, email: regEmail, password: regPassword });
      if (result?.success) {
        showToast(isCz ? 'Agentura registrována!' : 'Agency registered!', 'success');
        setCreatedInviteCode(result.inviteCode);
      }
    } catch (_err) { console.error(_err); } 
    finally { setLoading(false); }
  };

  const tabLabels = useMemo(() => ({
    login: isCz ? 'Přihlášení' : 'Login',
    'register-agency': isCz ? 'Nová agentura' : 'New Agency',
    'join-agency': isCz ? 'Připojit se' : 'Join Agency'
  }), [isCz]);

  const handleCopyCode = useCallback(() => {
    if (createdInviteCode) {
      navigator.clipboard.writeText(createdInviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [createdInviteCode]);

  return (
    <div className="login-page" style={STYLES.page}>
      <div style={STYLES.container}>
        
        <StatusBadge isCz={isCz} />
        <LogoHeader />

        {justLoggedOut && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.75rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem', animation: 'fadeInUp 0.4s ease-out' }}>
            <CheckCircle2 color="#10b981" size={18} />
            <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: '600' }}>{t('loggedOutSuccess')}</span>
            <button onClick={() => setJustLoggedOut(false)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>×</button>
          </div>
        )}

        {createdInviteCode ? (
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '1rem', borderRadius: '12px', animation: 'fadeInUp 0.4s ease-out' }}>
            <div style={{ color: '#93c5fd', fontSize: '0.7rem', fontWeight: '800', marginBottom: '0.5rem', textTransform: 'uppercase' }}>{isCz ? 'Zvací kód' : 'Invite Code'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <code style={{ flex: 1, padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', color: '#60a5fa', fontSize: '1rem', fontWeight: '900', fontFamily: 'monospace' }}>{createdInviteCode}</code>
              <button onClick={handleCopyCode} style={{ padding: '0.6rem', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', color: '#60a5fa', cursor: 'pointer' }}>{copied ? <Check size={16} /> : <Copy size={16} />}</button>
            </div>
            <button onClick={() => { setCreatedInviteCode(null); setTab('login'); }} style={{ ...STYLES.submitButton, marginTop: '1rem' }}>{isCz ? 'Přejít na přihlášení' : 'Go to Login'}</button>
          </div>
        ) : (
          <>
            <AuthTabNavigation activeTab={tab} setTab={setTab} labels={tabLabels} />

            <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '20px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', minHeight: '280px' }}>
              {isMounting ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                   <div className="skeleton" style={{ width: '100%', height: '42px', borderRadius: '10px' }} />
                   <div className="skeleton" style={{ width: '100%', height: '42px', borderRadius: '10px' }} />
                   <div className="skeleton" style={{ width: '100%', height: '48px', borderRadius: '10px' }} />
                </div>
              ) : (
                <>
                  {tab === 'login' && (
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <MemoInput label={isCz ? 'E-mail' : 'Email'} icon={Mail} type="email" value={email} onChange={setEmail} placeholder="you@email.com" autoFocus />
                      <MemoInput label={isCz ? 'Heslo' : 'Password'} icon={Lock} value={password} onChange={setPassword} placeholder="••••••••" showToggle onToggle={() => setShowPassword(!showPassword)} isToggled={showPassword} />
                      <button type="submit" disabled={loading} style={STYLES.submitButton}>
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <>{isCz ? 'Přihlásit' : 'Sign In'}<ArrowRight size={16} /></>}
                      </button>
                    </form>
                  )}

                  {tab === 'register-agency' && (
                    <form onSubmit={handleRegisterAgency} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <MemoInput label={isCz ? 'Název agentury' : 'Agency Name'} icon={Building2} value={regAgencyName} onChange={setRegAgencyName} placeholder="..." />
                      <MemoInput label={isCz ? 'Vaše jméno' : ' Your Name'} icon={User} value={regFullName} onChange={setRegFullName} placeholder="..." />
                      <MemoInput label="Email" icon={Mail} type="email" value={regEmail} onChange={setRegEmail} placeholder="..." />
                      <div>
                        <MemoInput label={isCz ? 'Heslo' : 'Password'} icon={Lock} value={regPassword} onChange={setRegPassword} placeholder="..." showToggle onToggle={() => setShowRegPassword(!showRegPassword)} isToggled={showRegPassword} />
                        <PasswordRequirements password={regPassword} isCz={isCz} />
                      </div>
                      <button type="submit" disabled={loading} style={{ ...STYLES.submitButton, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                        {loading ? <Loader2 className="animate-spin" size={16} /> : (isCz ? 'Vytvořit agenturu' : 'Create Agency')}
                        <ArrowRight size={16} />
                      </button>
                    </form>
                  )}

                  {(tab === 'join-agency' || tab === 'join-agency-expanded') && (
                    <form 
                      onSubmit={async (_err) => {
                        _err.preventDefault();
                        if (!joinInviteCode) return showToast(isCz ? 'Zadejte kód' : 'Enter code', 'error');
                        
                        if (tab === 'join-agency') {
                          setTab('join-agency-expanded');
                          return;
                        }

                        if (!joinFullName || !joinEmail || !joinPassword) {
                          return showToast(isCz ? 'Vyplňte všechna pole' : 'Fill all fields', 'error');
                        }

                        setLoading(true);
                        try {
                          const result = await onRegisterUser({ 
                            fullName: joinFullName, 
                            email: joinEmail, 
                            password: joinPassword, 
                            inviteCode: joinInviteCode 
                          });
                          
                          if (result?.success) {
                            showToast(isCz ? 'Registrace úspěšná! Nyní se můžete přihlásit.' : 'Registration successful! You can now log in.', 'success');
                            setTab('login');
                            setEmail(joinEmail);
                          } else {
                            showToast(result?.error || (isCz ? 'Registrace se nezdařila' : 'Registration failed'), 'error');
                          }
                        } catch (_err) {
                          console.error(_err);
                          showToast(isCz ? 'Chyba připojení' : 'Connection _err', 'error');
                        } finally {
                          setLoading(false);
                        }
                      }} 
                      style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                    >
                      <MemoInput label={isCz ? 'Zvací kód' : 'Invite Code'} icon={KeyRound} value={joinInviteCode} onChange={setJoinInviteCode} placeholder="NEXUS-..." />
                      
                      {tab === 'join-agency-expanded' && (
                        <>
                          <MemoInput label={isCz ? 'Vaše jméno' : 'Your Name'} icon={User} value={joinFullName} onChange={setJoinFullName} placeholder="..." />
                          <MemoInput label="Email" icon={Mail} type="email" value={joinEmail} onChange={setJoinEmail} placeholder="..." />
                          <div>
                            <MemoInput label={isCz ? 'Heslo' : 'Password'} icon={Lock} value={joinPassword} onChange={setJoinPassword} placeholder="..." showToggle onToggle={() => setShowJoinPassword(!setShowJoinPassword)} isToggled={showJoinPassword} />
                            <PasswordRequirements password={joinPassword} isCz={isCz} />
                          </div>
                        </>
                      )}

                      <button 
                        type="submit"
                        disabled={loading} 
                        style={STYLES.submitButton}
                      >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : (
                          tab === 'join-agency' ? (isCz ? 'Pokračovat' : 'Continue') : (isCz ? 'Zaregistrovat se' : 'Join Now')
                        )}
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.25rem' }}>
          <button 
            type="button"
            onClick={(_err) => {
              _err.preventDefault();
              setShowLanding(true);
            }} 
            style={{ 
              background: 'rgba(255,255,255,0.03)', 
              border: '1px solid rgba(255,255,255,0.05)', 
              borderRadius: '12px',
              padding: '0.6rem 1rem',
              color: '#94a3b8', 
              fontSize: '0.75rem', 
              fontWeight: '700', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(_err) => _err.currentTarget.style.color = 'white'}
            onMouseLeave={(_err) => _err.currentTarget.style.color = '#94a3b8'}
          >
            <Globe size={14} /> {t('backToProduct')}
          </button>
        </div>

        <div style={{ textAlign: 'center', opacity: 0.3, fontSize: '0.65rem', color: '#64748b', marginTop: '1rem', fontWeight: '800' }}>
          {APP_VERSION} • {API_BASE} • v3.21.1
        </div>

      </div>

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.05) 75%); background-size: 200% 100%; animation: skeleton-loading 1.5s infinite; }
        @keyframes skeleton-loading { from { background-position: 200% 0; } to { background-position: -200% 0; } }
      `}</style>
    </div>
  );
};

export default LoginScreen;
