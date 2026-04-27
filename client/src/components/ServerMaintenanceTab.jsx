import React, { useState } from 'react';
import {
  Copy, AlertCircle, CheckCircle, Database, 
  HardDrive, RefreshCw, Clock, Shield,
  Terminal, FileText, ChevronDown, ChevronUp
} from 'lucide-react';

const ServerMaintenanceTab = ({ lang }) => {
  const [copied, setCopied] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    credentials: true,
    backup: false,
    migration: false,
    diagnostics: false,
    directory: false
  });

  const deployManual = {
    cz: {
      title: 'Provozní Manuál - Správa Serveru',
      subtitle: 'Pedstavuje hlavní referenci pro správu a aktualizaci produkčního prostředí',
      quickDeploy: {
        title: '🚀 Rychlá Aktualizace (Deploy)',
        description: 'Pro nasazení nových změn z repozitáře spusťte na serveru:',
        command: 'cd /root/nexus-backend && git pull origin main && npm install --production && npx prisma generate && pm2 restart nexus-backend-final'
      },
      credentials: {
        title: '🔐 Přístupové Údaje',
        items: [
          {
            service: 'SSH (Server)',
            user: 'root',
            password: 'a3P!?Usa#v2e6Vf,',
            note: 'Host: 78.141.202.139 (s čárkou na konci)'
          },
          {
            service: 'PostgreSQL',
            user: 'nexus',
            password: 'nexus_prod_2024!',
            note: 'DB: nexus_prod'
          },
          {
            service: 'PM2 Process',
            user: '—',
            password: 'nexus-backend-final',
            note: 'Název procesu v PM2'
          }
        ]
      },
      backup: {
        title: '💾 Správa Databáze - Zálohování',
        description: 'Zálohy se ukládají do /var/backups/. Ruční záloha se provede příkazem:',
        command: 'PGPASSWORD="nexus_prod_2024!" pg_dump -h localhost -U nexus -d nexus_prod > /var/backups/backup_$(date +%Y%m%d_%H%M%S).sql'
      },
      migration: {
        title: '⚙️ Správa Databáze - Migrace Schématu',
        description: 'Pokud dojde ke změně v schema.prisma, spusťte:',
        command: 'export DATABASE_URL="postgresql://nexus:nexus_prod_2024%21@localhost:5432/nexus_prod"\nnpx prisma migrate deploy'
      },
      diagnostics: {
        title: '🛠️ Diagnostika a Logy',
        items: [
          {
            name: 'Zobrazení běžících procesů',
            command: 'pm2 list'
          },
          {
            name: 'Sledování logů v reálném čase',
            command: 'pm2 logs nexus-backend-final'
          },
          {
            name: 'Kontrola obsazení RAM/CPU',
            command: 'pm2 monit'
          },
          {
            name: 'Restartování celého PM2',
            command: 'systemctl restart pm2-root'
          }
        ]
      },
      directory: {
        title: '📂 Struktura Adresářů',
        items: [
          { path: '/root/nexus-backend', desc: 'Zdrojový kód backendu (Node.js/Express)' },
          { path: '/var/backups', desc: 'Úložiště SQL záloh' },
          { path: '/root/.pm2/logs', desc: 'Systémové logy PM2' }
        ]
      }
    },
    en: {
      title: 'Server Operations Manual',
      subtitle: 'Main reference guide for managing and updating the production environment',
      quickDeploy: {
        title: '🚀 Quick Deploy',
        description: 'To deploy new changes from the repository on the server:',
        command: 'cd /root/nexus-backend && git pull origin main && npm install --production && npx prisma generate && pm2 restart nexus-backend-final'
      },
      credentials: {
        title: '🔐 Access Credentials',
        items: [
          {
            service: 'SSH (Server)',
            user: 'root',
            password: 'a3P!?Usa#v2e6Vf,',
            note: 'Host: 78.141.202.139 (with comma at end)'
          },
          {
            service: 'PostgreSQL',
            user: 'nexus',
            password: 'nexus_prod_2024!',
            note: 'DB: nexus_prod'
          },
          {
            service: 'PM2 Process',
            user: '—',
            password: 'nexus-backend-final',
            note: 'PM2 process name'
          }
        ]
      },
      backup: {
        title: '💾 Database Management - Backup',
        description: 'Backups are stored in /var/backups/. Manual backup command:',
        command: 'PGPASSWORD="nexus_prod_2024!" pg_dump -h localhost -U nexus -d nexus_prod > /var/backups/backup_$(date +%Y%m%d_%H%M%S).sql'
      },
      migration: {
        title: '⚙️ Database Management - Schema Migration',
        description: 'If schema.prisma changes, run:',
        command: 'export DATABASE_URL="postgresql://nexus:nexus_prod_2024%21@localhost:5432/nexus_prod"\nnpx prisma migrate deploy'
      },
      diagnostics: {
        title: '🛠️ Diagnostics and Logs',
        items: [
          {
            name: 'Display running processes',
            command: 'pm2 list'
          },
          {
            name: 'Monitor logs in real-time',
            command: 'pm2 logs nexus-backend-final'
          },
          {
            name: 'Check RAM/CPU usage',
            command: 'pm2 monit'
          },
          {
            name: 'Restart PM2',
            command: 'systemctl restart pm2-root'
          }
        ]
      },
      directory: {
        title: '📂 Directory Structure',
        items: [
          { path: '/root/nexus-backend', desc: 'Backend source code (Node.js/Express)' },
          { path: '/var/backups', desc: 'SQL backup storage' },
          { path: '/root/.pm2/logs', desc: 'PM2 system logs' }
        ]
      }
    }
  };

  const manual = deployManual[lang] || deployManual.cz;

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };



  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem' }}>
      
      {/* Header */}
      <div>
        <h2 style={{
          fontSize: '1.75rem',
          fontWeight: '900',
          background: 'linear-gradient(to right, #6366f1, #a855f7)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '0.5rem'
        }}>
          {manual.title}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {manual.subtitle}
        </p>
      </div>

      {/* Alert */}
      <div style={{
        background: 'rgba(248, 113, 113, 0.1)',
        border: '1px solid rgba(248, 113, 113, 0.3)',
        borderRadius: '8px',
        padding: '1rem',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start'
      }}>
        <AlertCircle size={20} style={{ color: '#f87171', marginTop: '0.25rem', flexShrink: 0 }} />
        <div>
          <p style={{ fontWeight: '700', color: '#f87171', marginBottom: '0.25rem' }}>
            {lang === 'cz' ? '⚠️ POZOR' : '⚠️ CAUTION'}
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {lang === 'cz'
              ? 'Tato data obsahují citlivé údaje pro přístup k produkčnímu serveru. Udržujte je v bezpečí a nesdílujte!'
              : 'This data contains sensitive information for production server access. Keep it secure and do not share!'}
          </p>
        </div>
      </div>

      {/* Quick Deploy */}
      <CollapsibleSection expandedSections={expandedSections} toggleSection={toggleSection} sectionKey="quickDeploy" title={manual.quickDeploy.title}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          {manual.quickDeploy.description}
        </p>
        <CommandBlock copied={copied} copyToClipboard={copyToClipboard} command={manual.quickDeploy.command} id="deploy" />
      </CollapsibleSection>

      {/* Credentials */}
      <CollapsibleSection expandedSections={expandedSections} toggleSection={toggleSection} sectionKey="credentials" title={manual.credentials.title}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.9rem'
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '700' }}>
                  {lang === 'cz' ? 'Služba' : 'Service'}
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '700' }}>
                  {lang === 'cz' ? 'Uživatel' : 'User'}
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '700' }}>
                  {lang === 'cz' ? 'Heslo / Klíč' : 'Password / Key'}
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '700' }}>
                  {lang === 'cz' ? 'Poznámka' : 'Note'}
                </th>
              </tr>
            </thead>
            <tbody>
              {manual.credentials.items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: '600' }}>{item.service}</td>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: '#10b981' }}>{item.user}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <code style={{ fontFamily: 'monospace', color: '#f59e0b', fontSize: '0.85rem' }}>
                        {item.password}
                      </code>
                      <button
                        onClick={() => copyToClipboard(item.password, `cred-${idx}`)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--accent-color)',
                          padding: '0.25rem',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title={lang === 'cz' ? 'Zkopírovat' : 'Copy'}
                      >
                        {copied === `cred-${idx}` ? <CheckCircle size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {item.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      {/* Backup */}
      <CollapsibleSection expandedSections={expandedSections} toggleSection={toggleSection} sectionKey="backup" title={manual.backup.title}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          {manual.backup.description}
        </p>
        <CommandBlock copied={copied} copyToClipboard={copyToClipboard} command={manual.backup.command} id="backup" />
      </CollapsibleSection>

      {/* Migration */}
      <CollapsibleSection expandedSections={expandedSections} toggleSection={toggleSection} sectionKey="migration" title={manual.migration.title}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          {manual.migration.description}
        </p>
        <CommandBlock copied={copied} copyToClipboard={copyToClipboard} command={manual.migration.command} id="migration" />
      </CollapsibleSection>

      {/* Diagnostics */}
      <CollapsibleSection expandedSections={expandedSections} toggleSection={toggleSection} sectionKey="diagnostics" title={manual.diagnostics.title}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {manual.diagnostics.items.map((item, idx) => (
            <div key={idx} style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <p style={{ fontWeight: '700', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                {item.name}
              </p>
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '4px',
                padding: '0.75rem',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                color: '#10b981',
                marginBottom: '0.75rem'
              }}>
                {item.command}
              </div>
              <button
                onClick={() => copyToClipboard(item.command, `diag-${idx}`)}
                style={{
                  background: 'var(--accent-color)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '4px',
                  padding: '0.4rem 0.75rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(_err) => _err.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(_err) => _err.currentTarget.style.opacity = '1'}
              >
                {copied === `diag-${idx}` ? <CheckCircle size={12} /> : <Copy size={12} />}
                {lang === 'cz' ? 'Zkopírovat' : 'Copy'}
              </button>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Directory Structure */}
      <CollapsibleSection expandedSections={expandedSections} toggleSection={toggleSection} sectionKey="directory" title={manual.directory.title}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {manual.directory.items.map((item, idx) => (
            <div key={idx} style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <HardDrive size={18} style={{ color: '#6366f1' }} />
                <code style={{
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  color: '#10b981',
                  fontWeight: '600'
                }}>
                  {item.path}
                </code>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </CollapsibleSection>

    </div>
  );
};

export default ServerMaintenanceTab;

const CommandBlock = ({ command, id, copied, copyToClipboard }) => (
  <div style={{
    background: 'rgba(0, 0, 0, 0.5)',
    border: '1px solid var(--card-border)',
    borderRadius: '8px',
    padding: '1rem',
    marginTop: '0.75rem',
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    color: '#10b981',
    wordBreak: 'break-all',
    position: 'relative'
  }}>
    <div style={{ marginBottom: '0.5rem' }}>{command}</div>
    <button
      onClick={() => copyToClipboard(command, id)}
      style={{
        position: 'absolute',
        top: '0.5rem',
        right: '0.5rem',
        background: copied === id ? '#10b981' : 'var(--accent-color)',
        border: 'none',
        color: 'white',
        borderRadius: '4px',
        padding: '0.25rem 0.75rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontSize: '0.75rem',
        transition: 'all 0.2s'
      }}
    >
      {copied === id ? <CheckCircle size={14} /> : <Copy size={14} />}
    </button>
  </div>
);

const CollapsibleSection = ({ sectionKey, title, children, expandedSections, toggleSection }) => (
  <div style={{
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--card-border)',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    overflow: 'hidden'
  }}>
    <button
      onClick={() => toggleSection(sectionKey)}
      style={{
        width: '100%',
        padding: '1rem',
        background: 'transparent',
        border: 'none',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        color: 'var(--text-primary)',
        fontWeight: '700',
        fontSize: '1rem',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(_err) => _err.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
      onMouseLeave={(_err) => _err.currentTarget.style.background = 'transparent'}
    >
      <span>{title}</span>
      {expandedSections[sectionKey] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
    </button>
    {expandedSections[sectionKey] && (
      <div style={{ padding: '0 1rem 1rem 1rem', borderTop: '1px solid var(--card-border)' }}>
        {children}
      </div>
    )}
  </div>
);
