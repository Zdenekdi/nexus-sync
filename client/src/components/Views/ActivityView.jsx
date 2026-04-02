import React from 'react';
import { Shield, User } from 'lucide-react';

const ActivityView = ({ 
  isMobile, 
  t, 
  activeClient, 
  auditLogs, 
  availableOperators 
}) => {
  const filteredLogs = auditLogs.filter(log => 
    availableOperators.some(op => op.name === log.operator)
  );

  return (
    <div style={{ padding: isMobile ? '1.5rem 1rem' : '2rem', flex: 1, overflowY: isMobile ? 'visible' : 'auto' }} className="fade-in custom-scrollbar">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '2.5rem', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '1rem' : 0 }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '1.75rem' : '2rem', fontWeight: '800' }}>
            {t('auditTrail')} - {activeClient?.name || t('system')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: isMobile ? '0.85rem' : '1rem' }}>
            {t('auditSubtitle')}
          </p>
        </div>
        <div className="status-badge" style={{ borderColor: 'var(--accent-color)', color: 'var(--accent-color)' }}>
          < Shield size={14} /> {t('encryptedLog')}
        </div>
      </div>

      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredLogs.map(log => (
            <div key={log.id} className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700' }}>{log.timestamp}</span>
                <code className="hash-code" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>{log.hash}</code>
              </div>
              <div style={{ fontWeight: '800', fontSize: '1rem', marginBottom: '0.5rem' }}>{log.action}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <User size={12} /> {log.operator}
                </div>
                {log.profile !== 'N/A' && <div className="status-badge-small" style={{ fontSize: '0.65rem' }}>{log.profile}</div>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card custom-scrollbar" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--card-border)' }}>
                {[t('timestamp'), t('event'), t('handledBy'), t('target'), t('hash')].map(h => 
                  <th key={h} style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td style={{ padding: '1.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{log.timestamp}</td>
                  <td style={{ padding: '1.25rem', fontWeight: '700' }}>{log.action}</td>
                  <td style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <User size={14} /> {log.operator}
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem' }}>
                    {log.profile !== 'N/A' ? <div className="status-badge-small">{log.profile}</div> : '-'}
                  </td>
                  <td style={{ padding: '1.25rem' }}><code className="hash-code">{log.hash}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ActivityView;
