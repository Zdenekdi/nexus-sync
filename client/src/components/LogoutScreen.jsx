import React from 'react';
import { useNexus } from '../context/ContextHook';
import AuthLayout from './AuthLayout';
import { LogOut, ArrowRight, Home } from 'lucide-react';

const LogoutScreen = () => {
  const { lang } = useNexus();
  const isCz = lang === 'cz';

  const handleLoginRedirect = () => {
    const cleanPath = '/login';
    const targetPath = lang && lang !== 'cz' ? `/${lang}${cleanPath}` : cleanPath;
    window.location.href = targetPath;
  };

  const handleHomeRedirect = () => {
    const cleanPath = '/';
    const targetPath = lang && lang !== 'cz' ? `/${lang}` : cleanPath;
    window.location.href = targetPath;
  };

  return (
    <AuthLayout subtitle={isCz ? 'Odhlášení' : 'Logout'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', textAlign: 'center' }}>
        <header style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          {/* Ikona byla červená. Červená je ale v tomhle produktu vyhrazená SOS
              a destruktivním akcím — odhlášení není ani jedno a barva tam ubírá
              důraz tam, kde musí zabrat. Proto neutrální. */}
          <div style={{ 
            width: '64px', height: '64px', borderRadius: '12px', 
            background: 'rgba(255,255,255,0.04)', border: '1px solid #242a36',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.55)'
          }}>
            <LogOut size={32} />
          </div>
          <h3 style={{ fontSize: '2rem', fontWeight: '950', color: 'white', margin: 0, letterSpacing: '-0.02em' }}>
            {isCz ? 'Odhlášení proběhlo' : 'You are signed out'}
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontWeight: '500', lineHeight: '1.4' }}>
            {isCz 
              ? 'Vaše relace byla bezpečně ukončena. Děkujeme, že používáte Nexus Hub.' 
              : 'Your session has been securely ended. Thank you for using Nexus Hub.'}
          </p>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button 
            onClick={handleLoginRedirect}
            style={{
              width: '100%', padding: '1.25rem',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white', border: 'none', borderRadius: '12px',
              fontSize: '1.1rem', fontWeight: '950', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.85rem',
              boxShadow: '0 20px 40px -10px rgba(59, 130, 246, 0.4)',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {isCz ? 'Přihlásit se znovu' : 'Sign in again'} <ArrowRight size={20} />
          </button>

          <button 
            onClick={handleHomeRedirect}
            style={{
              width: '100%', padding: '1.25rem',
              background: '#11141c', 
              border: '1px solid #242a36',
              color: 'white', borderRadius: '12px',
              fontSize: '1.1rem', fontWeight: '950', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.85rem',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
          >
            <Home size={20} /> {isCz ? 'Přejít na úvodní stránku' : 'Go to landing page'}
          </button>
        </div>

        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', margin: 0, lineHeight: 1.5 }}>
          {isCz
            ? 'Pokud jste se odhlásili na cizím počítači, doporučujeme změnit heslo.'
            : 'If you signed out on a shared computer, we recommend changing your password.'}
        </p>
      </div>
    </AuthLayout>
  );
};

export default LogoutScreen;
