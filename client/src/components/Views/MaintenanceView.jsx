import React, { useState } from 'react';
import { 
  Server, 
  Database, 
  Terminal, 
  RefreshCcw, 
  ShieldCheck, 
  Code2, 
  Github, 
  ExternalLink,
  Clipboard,
  Activity,
  History,
  HardDrive,
  Info,
  Shield,
  Loader2
} from 'lucide-react';
import { useNexus } from '../../context/ContextHook';
import SystemHealthTab from '../SystemHealthTab';

const MaintenanceView = () => {
  const { 
    lang, 
    showToast, 
    selectedServerId, 
    setSelectedServerId, 
    availableServers,
    _activeOperator,
    isAppOwner,
    loading,
    t
  } = useNexus();
  const [activeTab, setActiveTab] = useState('live');

  if (loading) {
    return (
      <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Loader2 className="animate-spin" size={32} color="var(--accent-color)" />
      </div>
    );
  }

  if (!isAppOwner) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
        <Shield size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
        <p>{t('app_owner_only')}</p>
      </div>
    );
  }

  const selectedServer = availableServers.find(s => s.id === selectedServerId) || availableServers[0];

  const handleServerChange = (id) => {
    setSelectedServerId(id);
    showToast(t('server_switched', { name: availableServers.find(s => s.id === id)?.name }), 'info');
  };

  const sections = [
    // ... same as before
    {
      id: 'backend',
      title: 'Backend (Node.js & PM2)',
      icon: <Server size={20} color="#10b981" />,
      content: [
        { label: 'Status procesů', cmd: 'pm2 status', desc: 'Zobrazí přehled běžících služeb.' },
        { label: 'Restart serveru', cmd: 'pm2 restart nexus-backend-final --update-env', desc: 'Restartuje backend pro načtení změn.' },
        { label: 'Zobrazení logů', cmd: 'pm2 logs nexus-backend-final', desc: 'Ukáže výstup v reálném čase pro ladění chyb.' },
        { label: 'Smazání logů', cmd: 'pm2 flush', desc: 'Pročistí staré logy pro uvolnění místa.' }
      ]
    },
    {
      id: 'database',
      title: 'Databáze (Prisma & PostgreSQL)',
      icon: <Database size={20} color="#3b82f6" />,
      content: [
        { label: 'Nové migrace', cmd: 'npx prisma migrate dev', desc: 'Aplikuje změny ve schématu databáze.' },
        { label: 'Prisma Studio', cmd: 'npx prisma studio', desc: 'Otevře webové rozhraní pro prohlížení dat.' },
        { label: 'Kontrola spojení', cmd: 'npx prisma db pull', desc: 'Ověří integritu mezi schématem a databází.' }
      ]
    },
    {
      id: 'deploy',
      title: 'Nasazení (Deployment)',
      icon: <Github size={20} color="#f59e0b" />,
      content: [
        { label: 'Frontend Deploy', cmd: 'npm run build && firebase deploy', desc: 'Zkompiluje web a odešle na Firebase hosting.' },
        { label: 'Backend Pull', cmd: 'git pull origin master && pm2 restart all', desc: 'Stáhne nejnovější kód ze serveru a restartuje služby.' }
      ]
    }
  ];

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div data-testid="page-maintenance-container" className="maintenance-view fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h2 data-testid="page-maintenance-title" style={{ fontSize: '2rem', fontWeight: '900', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            {lang === 'cz' ? 'Údržba a Stav Systému' : 'Maintenance & System Status'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '800px' }}>
            {lang === 'cz' 
              ? 'Kompletní přehled zdraví serveru a nástroje pro správu produkčního prostředí Nexus Hub.' 
              : 'Complete overview of server health and tools for managing the Nexus Hub production environment.'}
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Server Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '0.5rem' }}>
              {lang === 'cz' ? 'VYBRANÝ SERVER' : 'SELECTED SERVER'}
            </span>
            <div style={{ position: 'relative' }}>
              <select 
                value={selectedServerId}
                onChange={(e) => handleServerChange(e.target.value)}
                style={{
                  appearance: 'none',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '12px',
                  padding: '0.6rem 2.5rem 0.6rem 1rem',
                  color: 'white',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  outline: 'none',
                  minWidth: '200px'
                }}
              >
                {availableServers.map(server => (
                  <option key={server.id} value={server.id} style={{ background: '#111', color: 'white' }}>
                    {server.name} ({server.ip})
                  </option>
                ))}
              </select>
              <Server size={14} color="var(--accent-color)" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* View Toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
          <button 
            onClick={() => setActiveTab('live')}
            style={{ 
              padding: '0.6rem 1.2rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '800',
              background: activeTab === 'live' ? 'var(--accent-color)' : 'transparent',
              color: activeTab === 'live' ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            <Activity size={14} style={{ marginRight: '0.5rem' }} /> {lang === 'cz' ? 'Živý Stav' : 'Live Status'}
          </button>
          <button 
            onClick={() => setActiveTab('manual')}
            style={{ 
              padding: '0.6rem 1.2rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '800',
              background: activeTab === 'manual' ? 'var(--accent-color)' : 'transparent',
              color: activeTab === 'manual' ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            <Terminal size={14} style={{ marginRight: '0.5rem' }} /> {lang === 'cz' ? 'Příkazy' : 'Commands'}
          </button>
        </div>
        </div>
      </div>

      {activeTab === 'live' ? (
        <SystemHealthTab server={selectedServer} />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {sections.map((section) => (
              <div key={section.id} className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '12px' }}>
                    {section.icon}
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '800' }}>{section.title}</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {section.content.map((item, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                          {item.label}
                        </span>
                        <button 
                          onClick={() => copyToClipboard(item.cmd)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.5 }}
                          title="Kopírovat příkaz"
                        >
                          <Clipboard size={14} color="white" />
                        </button>
                      </div>
                      <div style={{ 
                        background: 'rgba(0,0,0,0.3)', 
                        padding: '0.75rem', 
                        borderRadius: '10px', 
                        fontFamily: 'monospace', 
                        fontSize: '0.8rem', 
                        color: '#10b981', 
                        border: '1px solid rgba(16,185,129,0.1)',
                        wordBreak: 'break-all'
                      }}>
                        {item.cmd}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                        {item.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Server Health Snippet */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(37, 99, 235, 0.05) 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <ShieldCheck size={32} color="var(--accent-color)" />
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '800', marginBottom: '0.2rem' }}>{lang === 'cz' ? 'Doporučení pro stabilitu' : 'Stability Recommendations'}</h4>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {lang === 'cz' 
                    ? 'Před nasazením změn na backendu vždy nejprve spusťte npm install, pokud se změnily závislosti. Pravidelně kontrolujte logy pm2 logs pro sledování neočekávaných pádů.'
                    : 'Always run npm install before deploying backend changes if dependencies have changed. Regularly check pm2 logs to monitor for unexpected crashes.'}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MaintenanceView;
