import React from 'react';
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
  HardDrive
} from 'lucide-react';

const MaintenanceView = () => {
  const sections = [
    {
      id: 'backend',
      title: 'Backend (Node.js & PM2)',
      icon: <Server size={20} color="#10b981" />,
      content: [
        { label: 'Status procesů', cmd: 'pm2 status', desc: 'Zobrazí přehled běžících služeb.' },
        { label: 'Restart serveru', cmd: 'pm2 restart nexus-backend', desc: 'Restartuje backend pro načtení změn.' },
        { label: 'Zobrazení logů', cmd: 'pm2 logs nexus-backend', desc: 'Ukáže výstup v reálném čase pro ladění chyb.' },
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
    // Visual feedback could be added here
  };

  return (
    <div data-testid="page-maintenance-container" className="maintenance-view fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ marginBottom: '0.5rem' }}>
        <h2 data-testid="page-maintenance-title" style={{ fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          Údržba serveru a databáze
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '800px' }}>
          Tento manuál slouží jako rychlý přehled příkazů pro údržbu produkčního prostředí Nexus Hub. 
          Všechny příkazy spouštějte v SSH terminálu serveru Vultr.
        </p>
      </div>

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
            <h4 style={{ fontSize: '0.9rem', fontWeight: '800', marginBottom: '0.2rem' }}>Doporučení pro stabilitu</h4>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Před nasazením změn na backendu vždy nejprve spusťte <code style={{ color: 'white' }}>npm install</code>, pokud se změnily závislosti. 
              Pravidelně kontrolujte logy <code style={{ color: 'white' }}>pm2 logs</code> pro sledování neočekávaných pádů.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceView;
