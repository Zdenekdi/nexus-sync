import React from 'react';
import { 
  Book, 
  Terminal, 
  Zap, 
  Smartphone, 
  ArrowRight, 
  Download, 
  Copy, 
  Check,
  AlertCircle
} from 'lucide-react';
import { useNexus } from '../../context/ContextHook';

const CommandBlock = ({ cmd, id, copiedCmd, copyToClipboard }) => (
  <div style={{ 
    background: 'rgba(0,0,0,0.3)', 
    borderRadius: '12px', 
    padding: '1rem', 
    fontFamily: 'monospace', 
    fontSize: '0.85rem', 
    color: '#10b981',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid rgba(16, 185, 129, 0.1)',
    marginBottom: '1rem'
  }}>
    <span>{cmd}</span>
    <button 
      onClick={() => copyToClipboard(cmd, id)}
      style={{ background: 'none', border: 'none', color: 'rgba(16, 185, 129, 0.5)', cursor: 'pointer' }}
    >
      {copiedCmd === id ? <Check size={16} color="var(--success-color)" /> : <Copy size={16} />}
    </button>
  </div>
);

const DocsView = () => {
  const { lang, showToast } = useNexus();
  const [copiedCmd, setCopiedCmd] = React.useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    showToast(lang === 'cz' ? 'Zkopírováno!' : 'Copied!', 'success');
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="docs-view fade-in" style={{ padding: '2.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent-color)', marginBottom: '0.5rem' }}>
          <Book size={24} />
          <span style={{ fontSize: '0.85rem', fontWeight: '800', letterSpacing: '0.2em' }}>KNIHOVNA ZNALOSTÍ</span>
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, letterSpacing: '-0.03em' }}>
          Návod na nasazení aplikací
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '0.5rem' }}>
          Vše, co potřebuješ k vytvoření a aktualizaci Nexus Relay systému.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '2.5rem' }}>
        
        {/* Section 1: OTA Update */}
        <section className="glass-card" style={{ padding: '2rem', borderRadius: '24px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>
              <Zap size={24} fill="currentColor" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>Bleskový Update (OTA)</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--success-color)', fontWeight: '700' }}>NEJRYCHLEJŠÍ CESTA</span>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Tento proces aktualizuje pouze webovou část aplikace (UI/UX). Uživatelům se v mobilu ukáže banner s možností okamžité aktualizace bez přeinstalace.
          </p>
          <div style={{ fontSize: '0.8rem', color: 'white', marginBottom: '0.5rem', fontWeight: '700' }}>SPUSTIT V ADRESÁŘI CLIENT:</div>
          <CommandBlock id="ota-cmd" cmd="npm run deploy:ota" copiedCmd={copiedCmd} copyToClipboard={copyToClipboard} />
        </section>

        {/* Section 2: Full APK Build */}
        <section className="glass-card" style={{ padding: '2rem', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Smartphone size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>Nativní Android Build (APK)</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700' }}>KOMPLETNÍ RE-INSTALACE</span>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Použij tento postup, pokud měníš Java kód, AndroidManifest nebo přidáváš nové Capacitor pluginy.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'white', marginBottom: '0.5rem', fontWeight: '700' }}>1. SYNCHRONIZACE:</div>
              <CommandBlock id="apk-sync" cmd="npm run build && npx cap sync android" copiedCmd={copiedCmd} copyToClipboard={copyToClipboard} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'white', marginBottom: '0.5rem', fontWeight: '700' }}>2. KOMPILACE APK:</div>
              <CommandBlock id="apk-build" cmd="cd android && ./gradlew assembleNexusRelayDebug" copiedCmd={copiedCmd} copyToClipboard={copyToClipboard} />
            </div>
          </div>
          
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <AlertCircle size={18} color="var(--accent-color)" />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Cesta k APK: <code style={{ color: 'white' }}>client/android/app/build/outputs/apk/nexusrelay/debug/</code>
            </div>
          </div>
        </section>

        {/* Section 3: Manual Upload */}
        <section className="glass-card" style={{ padding: '2rem', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Download size={24} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>Distribuce uživatelům</h2>
          </div>
          <ol style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', paddingLeft: '1.2rem', lineHeight: '1.6' }}>
            <li>Vygenerované APK nahraj v adminu v sekci <b>Infrastruktura</b>.</li>
            <li>Server automaticky detekuje verzi a vytáhne metadata.</li>
            <li>Ostatním uživatelům se v mobilu nabídne odkaz ke stažení.</li>
          </ol>
        </section>

      </div>
    </div>
  );
};

export default DocsView;
