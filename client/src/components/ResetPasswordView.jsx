import React, { useState } from 'react';
import { ShieldCheck, Lock } from 'lucide-react';

const ResetPasswordView = ({ onComplete, t }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleReset = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }
    if (newPassword.length < 6) {
      setError(t('passwordLengthError'));
      return;
    }
    onComplete(newPassword);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)', filter: 'blur(60px)' }}></div>
      <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '450px', padding: '3rem', position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--accent-color)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 0 30px var(--accent-glow)' }}><ShieldCheck color="white" size={32} /></div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '900', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{t('resetPasswordTitle')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('resetPasswordSubtitle')}</p>
        </div>
        <form onSubmit={handleReset} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.1em' }}>{t('newPasswordLabel').toUpperCase()}</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" required style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '1rem 1rem 1rem 3rem', borderRadius: '12px', color: 'white' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.1em' }}>{t('confirmPasswordLabel').toUpperCase()}</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '1rem 1rem 1rem 3rem', borderRadius: '12px', color: 'white' }} />
            </div>
          </div>
          {error && <div style={{ color: 'var(--error-color)', fontSize: '0.85rem', fontWeight: '700', textAlign: 'center' }}>{error}</div>}
          <button type="submit" className="action-btn" style={{ background: 'var(--accent-color)', color: 'white', padding: '1.1rem', fontSize: '1rem', fontWeight: '800', boxShadow: '0 10px 25px var(--accent-glow)', marginTop: '1rem' }}>{t('resetButton')}</button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordView;
