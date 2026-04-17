import React, { useState, useEffect } from 'react';
import { useNexus } from '../context/NexusContext';
import axios from 'axios';
import { 
  Lock, Mail, ArrowRight, Loader2, 
  Globe, Zap, CheckCircle2, User, Building2, KeyRound, Copy, Check,
  Eye, EyeOff
} from 'lucide-react';

import { API_BASE, APP_VERSION } from '../constants/config';

const LoginScreen = () => {
  const { onLogin, onRegisterAgency, onRegisterUser, t, setLang, lang, justLoggedOut, setJustLoggedOut, setShowLanding, showToast } = useNexus();
  const [tab, setTab] = useState('login'); // login | register-agency | join-agency
  const [loading, setLoading] = useState(false);
  const [createdInviteCode, setCreatedInviteCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showJoinPassword, setShowJoinPassword] = useState(false);

  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register agency form
  const [regFullName, setRegFullName] = useState('');
  const [regAgencyName, setRegAgencyName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regReferralCode, setRegReferralCode] = useState('');

  // Join agency form
  const [joinFullName, setJoinFullName] = useState('');
  const [joinEmail, setJoinEmail] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joinInviteCode, setJoinInviteCode] = useState('');
  const [joinRole, setJoinRole] = useState('Operator');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isCz = lang === 'cz' || lang === 'cs';

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showToast(isCz ? 'Vyplňte všechna pole' : 'Please fill in all fields', 'error');
      return;
    }
    if (!emailRegex.test(email)) {
      showToast(isCz ? 'Zadejte platný e-mail' : 'Please enter a valid email', 'error');
      return;
    }
    setLoading(true);
    try { await onLogin(email, password); } 
    catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const handleRegisterAgency = async (e) => {
    e.preventDefault();
    if (!regFullName || !regAgencyName || !regEmail || !regPassword) {
      showToast(isCz ? 'Vyplňte všechna pole' : 'Please fill in all fields', 'error');
      return;
    }
    if (!emailRegex.test(regEmail)) {
      showToast(isCz ? 'Zadejte platný e-mail' : 'Please enter a valid email', 'error');
      return;
    }
    if (regPassword.length < 8) {
      showToast(isCz ? 'Heslo musí mít alespoň 8 znaků' : 'Password must be at least 8 characters', 'error');
      return;
    }
    setLoading(true);
    try {
      const result = await onRegisterAgency({ fullName: regFullName, agencyName: regAgencyName, email: regEmail, password: regPassword, ...(regReferralCode && { referralCode: regReferralCode }) });
      if (result?.success) {
        showToast(isCz ? 'Agentura úspěšně zaregistrována!' : 'Agency registered successfully!', 'success');
        setCreatedInviteCode(result.inviteCode);
      } else {
        showToast(result?.error || (isCz ? 'Registrace selhala' : 'Registration failed'), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(isCz ? 'Chyba spojení' : 'Connection error', 'error');
    } finally { setLoading(false); }
  };

  const handleJoinAgency = async (e) => {
    e.preventDefault();
    if (!joinFullName || !joinEmail || !joinPassword || !joinInviteCode) {
      showToast(isCz ? 'Vyplňte všechna pole' : 'Please fill in all fields', 'error');
      return;
    }
    if (!emailRegex.test(joinEmail)) {
      showToast(isCz ? 'Zadejte platný e-mail' : 'Please enter a valid email', 'error');
      return;
    }
    if (joinPassword.length < 8) {
      showToast(isCz ? 'Heslo musí mít alespoň 8 znaků' : 'Password must be at least 8 characters', 'error');
      return;
    }
    setLoading(true);
    try {
      const result = await onRegisterUser({ fullName: joinFullName, email: joinEmail, password: joinPassword, inviteCode: joinInviteCode, roleName: joinRole });
      if (result?.success) {
        showToast(isCz ? 'Registrace úspěšná! Nyní se přihlaste.' : 'Registered! Please log in now.', 'success');
        setTab('login');
        setEmail(joinEmail);
      } else {
        showToast(result?.error || (isCz ? 'Registrace selhala' : 'Registration failed'), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(isCz ? 'Chyba spojení' : 'Connection error', 'error');
    } finally { setLoading(false); }
  };

  const handleCopyCode = () => {
    if (createdInviteCode) {
      navigator.clipboard.writeText(createdInviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleForgotPassword = () => {
    setShowResetModal(true);
    setResetEmail(email); // Prefill if user typed it
  };

  const submitResetRequest = async (e) => {
    e.preventDefault();
    if (!resetEmail || !emailRegex.test(resetEmail)) {
      showToast(isCz ? 'Zadejte platný e-mail' : 'Please enter a valid email', 'error');
      return;
    }
    setResetLoading(true);
    try {
      await axios.post(`${API_BASE}/auth/reset-password-request`, { email: resetEmail });
      showToast(isCz ? 'Odkaz pro reset hesla byl odeslán' : 'Password reset link sent', 'success');
      setShowResetModal(false);
    } catch (err) {
      showToast(isCz ? 'Chyba při odesílání' : 'Error sending request', 'error');
    } finally { setResetLoading(false); }
  };

  const getPasswordStrength = (pw) => {
    if (!pw || pw.length < 8) return { level: 'weak', color: '#ef4444', label: isCz ? 'Slabé' : 'Weak', width: '33%' };
    const hasMixed = /[a-z]/.test(pw) && /[A-Z]/.test(pw);
    const hasNumber = /\d/.test(pw);
    if (hasMixed && hasNumber) return { level: 'strong', color: '#10b981', label: isCz ? 'Silné' : 'Strong', width: '100%' };
    if (hasMixed) return { level: 'medium', color: '#f59e0b', label: isCz ? 'Střední' : 'Medium', width: '66%' };
    return { level: 'weak', color: '#ef4444', label: isCz ? 'Slabé' : 'Weak', width: '33%' };
  };

  const eyeToggleStyle = { position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 0, display: 'flex' };

  const PasswordStrengthBar = ({ password: pw }) => {
    if (!pw) return null;
    const strength = getPasswordStrength(pw);
    return (
      <div style={{ marginTop: '0.35rem' }}>
        <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: strength.width, background: strength.color, borderRadius: '2px', transition: 'all 0.3s ease' }} />
        </div>
        <div style={{ fontSize: '0.6rem', color: strength.color, fontWeight: '700', marginTop: '0.2rem' }}>{strength.label}</div>
      </div>
    );
  };

  const inputStyle = {
    width: '100%',
    padding: '0.6rem 0.85rem 0.6rem 2.4rem',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: 'white',
    fontSize: '0.85rem',
    outline: 'none'
  };

  const passwordInputStyle = { ...inputStyle, paddingRight: '2.5rem' };

  const labelStyle = { fontSize: '0.65rem', fontWeight: '800', color: '#64748b', marginBottom: '0.3rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const iconStyle = { position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' };

  const tabLabels = {
    login: isCz ? 'Přihlášení' : 'Login',
    'register-agency': isCz ? 'Nová agentura' : 'New Agency',
    'join-agency': isCz ? 'Připojit se' : 'Join Agency'
  };

  return (
    <div className="login-page" style={{
      minHeight: '100dvh',
      width: '100vw',
      background: '#040507',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'auto',
      padding: '1rem 0.5rem',
      position: 'fixed'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '380px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        animation: 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* LOGO */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '44px', height: '44px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            borderRadius: '12px',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
            marginBottom: '0.5rem'
          }}>
            <Zap color="white" size={22} fill="white" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '950', color: 'white', letterSpacing: '-0.03em', margin: 0 }}>
            Nexus Hub
          </h1>
        </div>

        {/* LOGOUT SUCCESS */}
        {justLoggedOut && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            padding: '0.75rem', borderRadius: '12px',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            animation: 'fadeInUp 0.4s ease-out'
          }}>
            <CheckCircle2 color="#10b981" size={18} />
            <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: '600' }}>{t('loggedOutSuccess')}</span>
            <button onClick={() => setJustLoggedOut(false)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem' }}>×</button>
          </div>
        )}

        {/* INVITE CODE SUCCESS */}
        {createdInviteCode && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            padding: '1rem', borderRadius: '12px',
            animation: 'fadeInUp 0.4s ease-out'
          }}>
            <div style={{ color: '#93c5fd', fontSize: '0.7rem', fontWeight: '800', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              {isCz ? 'Zvací kód vaší agentury' : 'Your Agency Invite Code'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <code style={{ 
                flex: 1, padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.4)', borderRadius: '8px',
                color: '#60a5fa', fontSize: '1rem', fontWeight: '900', letterSpacing: '0.05em', fontFamily: 'monospace'
              }}>
                {createdInviteCode}
              </code>
              <button onClick={handleCopyCode} style={{
                padding: '0.6rem', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px', color: '#60a5fa', cursor: 'pointer', display: 'flex'
              }}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: '0.5rem', lineHeight: '1.4' }}>
              {isCz 
                ? 'Sdílejte tento kód s členy vaší agentury. Mohou se pomocí něj registrovat přes záložku "Připojit se".'
                : 'Share this code with your team members. They can register using the "Join Agency" tab.'}
            </p>
            <button onClick={() => { setCreatedInviteCode(null); setTab('login'); }} style={{
              marginTop: '0.75rem', width: '100%', padding: '0.6rem',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer'
            }}>
              {isCz ? 'Přejít na přihlášení' : 'Go to Login'}
            </button>
          </div>
        )}

        {/* TABS */}


        {!createdInviteCode && (
          <>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '3px', border: '1px solid rgba(255,255,255,0.05)' }}>
              {['login', 'register-agency', 'join-agency'].map(t => (
                <button 
                  key={t} 
                  id={`tab-btn-${t}`}
                  data-testid={`tab-${t}`}
                  onClick={() => setTab(t)} 
                  style={{
                    flex: 1, padding: '0.5rem 0.25rem', border: 'none',
                    background: tab === t ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    color: tab === t ? '#60a5fa' : '#64748b',
                    borderRadius: '10px', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer',
                    transition: 'all 0.2s',
                    borderBottom: tab === t ? '2px solid #3b82f6' : '2px solid transparent'
                  }}
                >
                  {tabLabels[t]}
                </button>
              ))}
            </div>

            {/* FORM CARD */}
            <div className="glass-card" style={{
              padding: '1.25rem', borderRadius: '20px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)'
            }}>
              {/* LOGIN TAB */}
              {tab === 'login' && (
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>{isCz ? 'E-mail' : 'Email'}</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={14} style={iconStyle} />
                      <input 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        id="login-email"
                        name="email"
                        data-testid="login-email"
                        placeholder="you@email.com"
                        autoFocus
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>{isCz ? 'Heslo' : 'Password'}</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={14} style={iconStyle} />
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        placeholder="••••••••" 
                        required 
                        id="login-password"
                        data-testid="login-password"
                        style={passwordInputStyle}
                      />
                      <button type="button" onClick={() => setShowPassword(v => !v)} style={eyeToggleStyle}>
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <button type="button" onClick={handleForgotPassword} style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '0.7rem', fontWeight: '600', cursor: 'pointer', padding: '0.35rem 0 0', display: 'block' }}>
                      {isCz ? 'Zapomenuté heslo?' : 'Forgot password?'}
                    </button>
                  </div>
                  <button 
                    type="submit" 
                    disabled={loading} 
                    id="login-submit"
                    data-testid="login-submit"
                    style={{
                      width: '100%', padding: '0.75rem',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white', border: 'none', borderRadius: '10px',
                      fontSize: '0.85rem', fontWeight: '900', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.25rem'
                    }}
                  >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <>{isCz ? 'Přihlásit' : 'Sign In'}<ArrowRight size={16} /></>}
                  </button>
                </form>
              )}

              {/* REGISTER AGENCY TAB */}
              {tab === 'register-agency' && (
                <form onSubmit={handleRegisterAgency} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>{isCz ? 'Název agentury' : 'Agency Name'}</label>
                    <div style={{ position: 'relative' }}>
                      <Building2 size={14} style={iconStyle} />
                      <input type="text" value={regAgencyName} onChange={e => setRegAgencyName(e.target.value)} placeholder={isCz ? 'Moje Agentura s.r.o.' : 'My Agency Ltd.'} required style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>{isCz ? 'Vaše jméno' : 'Your Name'}</label>
                    <div style={{ position: 'relative' }}>
                      <User size={14} style={iconStyle} />
                      <input type="text" value={regFullName} onChange={e => setRegFullName(e.target.value)} placeholder={isCz ? 'Jan Novák' : 'John Smith'} required style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>{isCz ? 'E-mail' : 'Email'}</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={14} style={iconStyle} />
                      <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="admin@agency.com" required style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>{isCz ? 'Heslo (min. 8 znaků)' : 'Password (min. 8 chars)'}</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={14} style={iconStyle} />
                      <input type={showRegPassword ? 'text' : 'password'} value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="••••••••" required minLength={8} style={passwordInputStyle} />
                      <button type="button" onClick={() => setShowRegPassword(v => !v)} style={eyeToggleStyle}>
                        {showRegPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <PasswordStrengthBar password={regPassword} />
                  </div>
                  <div>
                    <label style={labelStyle}>{isCz ? 'Referral kód (volitelné)' : 'Referral Code (optional)'}</label>
                    <div style={{ position: 'relative' }}>
                      <KeyRound size={14} style={iconStyle} />
                      <input type="text" value={regReferralCode} onChange={e => setRegReferralCode(e.target.value.toUpperCase())} placeholder="REF-XXXXXXXX" style={inputStyle} />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="hover-bright" style={{
                    width: '100%', padding: '0.75rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white', border: 'none', borderRadius: '10px',
                    fontSize: '0.85rem', fontWeight: '900', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.25rem'
                  }}>
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <>{isCz ? 'Zaregistrovat agenturu' : 'Register Agency'}<ArrowRight size={16} /></>}
                  </button>
                </form>
              )}

              {/* JOIN AGENCY TAB */}
              {tab === 'join-agency' && (
                <form onSubmit={handleJoinAgency} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>{isCz ? 'Zvací kód' : 'Invite Code'}</label>
                    <div style={{ position: 'relative' }}>
                      <KeyRound size={14} style={iconStyle} />
                      <input type="text" value={joinInviteCode} onChange={e => setJoinInviteCode(e.target.value.toUpperCase())} placeholder="NEXUS-A1B2C3D4E5F6" required style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.05em' }} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>{isCz ? 'Vaše jméno' : 'Your Name'}</label>
                    <div style={{ position: 'relative' }}>
                      <User size={14} style={iconStyle} />
                      <input type="text" value={joinFullName} onChange={e => setJoinFullName(e.target.value)} placeholder={isCz ? 'Jan Novák' : 'John Smith'} required style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>{isCz ? 'E-mail' : 'Email'}</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={14} style={iconStyle} />
                      <input type="email" value={joinEmail} onChange={e => setJoinEmail(e.target.value)} placeholder="you@email.com" required style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>{isCz ? 'Heslo (min. 8 znaků)' : 'Password (min. 8 chars)'}</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={14} style={iconStyle} />
                      <input type={showJoinPassword ? 'text' : 'password'} value={joinPassword} onChange={e => setJoinPassword(e.target.value)} placeholder="••••••••" required minLength={8} style={passwordInputStyle} />
                      <button type="button" onClick={() => setShowJoinPassword(v => !v)} style={eyeToggleStyle}>
                        {showJoinPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <PasswordStrengthBar password={joinPassword} />
                  </div>
                  <div>
                    <label style={labelStyle}>{isCz ? 'Role' : 'Role'}</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {['Operator', 'Model'].map(r => (
                        <button key={r} type="button" onClick={() => setJoinRole(r)} style={{
                          flex: 1, padding: '0.5rem', border: joinRole === r ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                          background: joinRole === r ? 'rgba(59, 130, 246, 0.15)' : 'rgba(0,0,0,0.3)',
                          color: joinRole === r ? '#60a5fa' : '#94a3b8',
                          borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'
                        }}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="hover-bright" style={{
                    width: '100%', padding: '0.75rem',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    color: 'white', border: 'none', borderRadius: '10px',
                    fontSize: '0.85rem', fontWeight: '900', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.25rem'
                  }}>
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <>{isCz ? 'Připojit se' : 'Join Agency'}<ArrowRight size={16} /></>}
                  </button>
                </form>
              )}
            </div>
          </>
        )}

        {/* FOOTER: Lang + Back to Product */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <button onClick={() => setLang('cz')} style={{ padding: '3px 10px', border: 'none', background: lang === 'cz' ? '#3b82f6' : 'transparent', color: 'white', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '800', cursor: 'pointer' }}>CZ</button>
            <button onClick={() => setLang('en')} style={{ padding: '3px 10px', border: 'none', background: lang === 'en' ? '#3b82f6' : 'transparent', color: 'white', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '800', cursor: 'pointer' }}>EN</button>
          </div>
          <button 
            onClick={() => { setJustLoggedOut(false); setShowLanding(true); }}
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', padding: '6px 14px', borderRadius: '8px',
              fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px'
            }}
            onMouseOver={(e) => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.color = 'white'; }}
            onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#94a3b8'; }}
          >
            <Globe size={12} />
            {t('backToProduct')}
          </button>
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

        {/* RESET PASSWORD MODAL */}
        {showResetModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh',
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, padding: '1rem', animation: 'fadeIn 0.3s ease'
          }}>
            <div className="glass-card" style={{
              width: '100%', maxWidth: '340px', padding: '1.5rem', borderRadius: '24px',
              background: '#0a0d14', border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: '40px', height: '40px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <KeyRound size={20} color="#3b82f6" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'white' }}>{isCz ? 'Zapomenuté heslo' : 'Forgot Password'}</h3>
                <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.5rem' }}>{isCz ? 'Zadejte svůj e-mail a my vám pošleme odkaz pro obnovení' : 'Enter your email and we\'ll send you a recovery link'}</p>
              </div>

              <form onSubmit={submitResetRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>{isCz ? 'E-mail' : 'Email'}</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={14} style={iconStyle} />
                    <input 
                      type="email" 
                      value={resetEmail} 
                      onChange={e => setResetEmail(e.target.value)} 
                      placeholder="you@email.com" 
                      required 
                      style={inputStyle} 
                      data-testid="reset-email-input"
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setShowResetModal(false)} style={{
                    flex: 1, padding: '0.75rem', background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8',
                    borderRadius: '10px', fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer'
                  }}>{isCz ? 'Zrušit' : 'Cancel'}</button>
                  <button type="submit" disabled={resetLoading} style={{
                    flex: 2, padding: '0.75rem', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white', border: 'none', borderRadius: '10px',
                    fontSize: '0.85rem', fontWeight: '900', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                  }}>
                    {resetLoading ? <Loader2 className="animate-spin" size={16} /> : (isCz ? 'Odeslat' : 'Send')}
                  </button>
                </div>
              </form>
            </div>
            <style>{`
              @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
          </div>
        )}
        {/* DIAGNOSTIC FOOTER */}
        <div style={{
          marginTop: '2rem',
          textAlign: 'center',
          opacity: 0.3,
          fontSize: '0.6rem',
          color: '#64748b',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px'
        }}>
          <div>{APP_VERSION} ({import.meta.env.MODE})</div>
          <div style={{ fontFamily: 'monospace' }}>{API_BASE}</div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
