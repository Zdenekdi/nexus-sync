import React, { useState } from 'react';
import { useNexus } from '../context/NexusContext';
import { Mail, Lock, Shield, ArrowRight, UserPlus, Building2, Ticket } from 'lucide-react';

const LoginScreen = () => {
  const nexus = useNexus();
  const { onLogin, onRegisterAgency, onRegisterUser, onResetRequest, t } = nexus;
  
  const [mode, setMode] = useState('login'); // 'login', 'register-agency', 'register-user', 'forgot'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    agencyName: '',
    inviteCode: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'login') {
        const ok = await onLogin(formData.email, formData.password);
        if (!ok) setError(t('loginError'));
      } else if (mode === 'register-agency') {
        const ok = await onRegisterAgency({ 
          email: formData.email, 
          password: formData.password, 
          name: formData.name, 
          agencyName: formData.agencyName 
        });
        if (ok) { setSuccess(t('registrationSuccess')); setMode('login'); }
        else setError('Registration failed');
      } else if (mode === 'register-user') {
        const ok = await onRegisterUser({ 
          email: formData.email, 
          password: formData.password, 
          name: formData.name, 
          inviteCode: formData.inviteCode 
        });
        if (ok) { setSuccess(t('registrationSuccess')); setMode('login'); }
        else setError('Invalid invite code or registration failed');
      } else if (mode === 'forgot') {
        const ok = await onResetRequest(formData.email);
        if (ok) setSuccess(t('resetSent'));
        else setError('Reset request failed');
      }
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem 0.75rem 2.75rem',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--card-border)',
    borderRadius: '10px',
    color: 'white',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const iconStyle = {
    position: 'absolute',
    left: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'rgba(255,255,255,0.3)',
  };

  const buttonStyle = {
    width: '100%',
    padding: '0.85rem',
    background: 'var(--accent-color)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontWeight: '800',
    fontSize: '0.9rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    marginTop: '0.5rem'
  };

  const cardStyle = {
    width: '100%',
    maxWidth: '380px',
    padding: '1.5rem',
    background: 'rgba(15, 17, 23, 0.8)',
    backdropFilter: 'blur(15px)',
    borderRadius: '20px',
    border: '1px solid var(--card-border)',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    margin: 'auto'
  };

  return (
    <div style={{ 
      minHeight: '100dvh', 
      width: '100%', 
      display: 'flex', 
      background: '#050608',
      backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.05) 0%, transparent 50%)',
      padding: '1rem',
      overflow: 'hidden'
    }}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center' }}>
          <img src="/nexus_icon.png" style={{ width: '40px', marginBottom: '0.5rem' }} alt="Nexus" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: 'white' }}>
            {mode === 'login' && 'Nexus Hub'}
            {mode === 'forgot' && t('forgotPassword')}
            {mode === 'register-agency' && t('registerAgency')}
            {mode === 'register-user' && t('registerUser')}
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem' }}>
            {mode === 'login' ? 'The Industry Standard for Syncing' : 'Enter your details to proceed'}
          </p>
        </div>

        {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)', padding: '0.75rem', borderRadius: '10px', fontSize: '0.8rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</div>}
        {success && <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', padding: '0.75rem', borderRadius: '10px', fontSize: '0.8rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>{success}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {(mode === 'register-agency' || mode === 'register-user') && (
            <div style={{ position: 'relative' }}>
              <Users size={18} style={iconStyle} />
              <input 
                style={inputStyle} type="text" placeholder={t('fullNameLabel')} required 
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
          )}
          {mode === 'register-agency' && (
            <div style={{ position: 'relative' }}>
              <Building2 size={18} style={iconStyle} />
              <input 
                style={inputStyle} type="text" placeholder={t('agencyNameLabel')} required 
                value={formData.agencyName} onChange={e => setFormData({...formData, agencyName: e.target.value})}
              />
            </div>
          )}
          {mode === 'register-user' && (
            <div style={{ position: 'relative' }}>
              <Ticket size={18} style={iconStyle} />
              <input 
                style={inputStyle} type="text" placeholder={t('inviteCodeLabel')} required 
                value={formData.inviteCode} onChange={e => setFormData({...formData, inviteCode: e.target.value})}
              />
            </div>
          )}
          
          <div style={{ position: 'relative' }}>
            <Mail size={18} style={iconStyle} />
            <input 
              style={inputStyle} type="email" placeholder={t('emailLabel')} required 
              value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          {mode !== 'forgot' && (
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={iconStyle} />
              <input 
                style={inputStyle} type="password" placeholder={t('passwordLabel')} required 
                value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
          )}

          <button type="submit" disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.7 : 1 }}>
            {loading ? '...' : (
              <>
                {mode === 'login' ? t('loginButton') : mode === 'forgot' ? t('resetRequestButton') : t('registerButton')}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
          {mode === 'login' ? (
            <>
              <button onClick={() => setMode('forgot')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', cursor: 'pointer' }}>{t('forgotPassword')}</button>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button onClick={() => setMode('register-agency')} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>{t('registerAgency')}</button>
                <button onClick={() => setMode('register-user')} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>{t('registerUser')}</button>
              </div>
            </>
          ) : (
            <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', cursor: 'pointer' }}>{t('backToLogin')}</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
