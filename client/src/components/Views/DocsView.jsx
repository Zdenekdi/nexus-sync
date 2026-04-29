import React, { useState } from 'react';
import { 
  FileText, Copy, Check, Download, ExternalLink, 
  Terminal, Shield, Smartphone, Zap, FileCode
} from 'lucide-react';

const CommandBlock = ({ title, command, description }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: '16px',
      padding: '1.25rem',
      marginBottom: '1rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--accent-color)', fontWeight: '800' }}>{title}</h4>
        <button 
          onClick={handleCopy}
          style={{
            background: copied ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.05)',
            border: 'none',
            color: copied ? '#22c55e' : 'white',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.75rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'KOPÍROVÁNO' : 'KOPÍROVAT'}
        </button>
      </div>
      <div style={{
        background: '#040507',
        padding: '1rem',
        borderRadius: '10px',
        fontFamily: 'monospace',
        fontSize: '0.85rem',
        color: '#a5b4fc',
        overflowX: 'auto',
        marginBottom: '0.5rem',
        border: '1px solid rgba(255,255,255,0.03)'
      }}>
        {command}
      </div>
      {description && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-dim)' }}>{description}</p>}
    </div>
  );
};

const DocsView = ({ activeOperator }) => {
  // Check permission via prop instead of context to avoid circular dependency
  if (!activeOperator?.isAppOwner) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
        <Shield size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
        <p>Tato sekce je přístupná pouze pro App Ownera.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', animation: 'fadeIn 0.4s ease-out' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <div style={{ 
            width: '48px', height: '48px', borderRadius: '14px', 
            background: 'rgba(99, 102, 241, 0.1)', display: 'flex', 
            alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' 
          }}>
            <FileText size={28} />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '900' }}>Technická Dokumentace</h1>
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem' }}>
          Rychlé příkazy a postupy pro správu a nasazování systému Nexus Hub.
        </p>
      </header>

      <section style={{ marginBottom: '3rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.2rem', marginBottom: '1.5rem' }}>
          <Zap size={20} color="#fbbf24" /> NASAZOVÁNÍ (WEB / OTA)
        </h3>
        
        <CommandBlock 
          title="1. Blesková aktualizace (OTA)"
          command="cd client && npm run deploy:ota"
          description="Nahraje nejnovější verzi webu na Nexus API server. Mobilní aplikace si tuto verzi stáhnou okamžitě po kliku na 'Bleskový update' bez nutnosti stahovat nové APK."
        />

        <CommandBlock 
          title="2. Plné nasazení na Firebase"
          command="cd client && npm run build && firebase deploy --only hosting"
          description="Nasazení produkční verze webového rozhraní na Firebase Hosting."
        />
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.2rem', marginBottom: '1.5rem' }}>
          <Smartphone size={20} color="#60a5fa" /> MOBILNÍ VERZE (ANDROID)
        </h3>

        <div style={{ 
          background: 'rgba(59, 130, 246, 0.05)', 
          borderLeft: '4px solid #3b82f6',
          padding: '1.25rem',
          borderRadius: '0 12px 12px 0',
          marginBottom: '1.5rem',
          fontSize: '0.9rem'
        }}>
          <strong>Před vytvořením APK:</strong> Nezapomeňte zvýšit verzi v <code>client/package.json</code> (např. z 3.21.0 na 3.22.0) a spusťte <code>npm run build</code>.
        </div>
        
        <CommandBlock 
          title="1. Synchronizace Capacitoru"
          command="npx cap sync android"
          description="Zkopíruje zkompilovaný web do Android projektu."
        />

        <CommandBlock 
          title="2. Spuštění v Android Studio"
          command="npx cap open android"
          description="Otevře Android Studio pro finální vygenerování podepsaného APK / AAB."
        />
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.2rem', marginBottom: '1.5rem' }}>
          <Terminal size={20} color="#10b981" /> UŽITEČNÉ NÁSTROJE
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" style={toolCardStyle}>
            <ExternalLink size={18} /> Firebase Console
          </a>
          <a href="https://nexus-api.myvnc.com/api/docs" target="_blank" rel="noreferrer" style={toolCardStyle}>
            <FileCode size={18} /> API Dokumentace
          </a>
        </div>
      </section>

      <footer style={{ marginTop: '4rem', padding: '2rem 0', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
          Nexus Hub Infrastructure • Built with React 19 & Capacitor 8
        </p>
      </footer>
    </div>
  );
};

const toolCardStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.75rem',
  padding: '1rem',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.05)',
  borderRadius: '12px',
  color: 'white',
  textDecoration: 'none',
  fontSize: '0.9rem',
  fontWeight: '600',
  transition: 'all 0.2s'
};

export default DocsView;
