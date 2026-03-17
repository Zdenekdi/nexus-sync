import React from 'react';
import { FileSearch, StickyNote } from 'lucide-react';

const QAView = ({ t, messages = [], clientNotes = {} }) => {
  return (
    <div style={{ padding: '3rem', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileSearch size={28} color="var(--accent-color)" /> {t('qa')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{t('qaSubtitle')}</p>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {messages.reduce((acc, msg) => {
          if (!acc.find(m => m.from === msg.from)) acc.push(msg);
          return acc;
        }, []).map(clientMsg => (
          <div key={clientMsg.from} className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.2rem' }}>
                  {clientMsg.from ? clientMsg.from.slice(-2) : '??'}
                </div>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>{clientMsg.from || t('unknown')}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('clientHistory')}</div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 style={{ fontSize: '0.9rem', color: '#f59e0b', marginBottom: '1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <StickyNote size={16} /> {t('internalNotesLog')}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(clientNotes[clientMsg.from] || []).map(note => (
                  <div key={note.id} style={{ background: 'rgba(245, 158, 11, 0.05)', borderLeft: '4px solid #f59e0b', padding: '1rem', borderRadius: '0 12px 12px 0' }}>
                    <div style={{ fontSize: '1rem', color: 'white', marginBottom: '0.75rem', lineHeight: '1.5' }}>{note.text}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span>{t('loggedBy')}: <strong style={{ color: 'white' }}>{note.author}</strong></span>
                      <span>{note.timestamp}</span>
                    </div>
                  </div>
                ))}
                {(!clientNotes[clientMsg.from] || clientNotes[clientMsg.from].length === 0) && (
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '1rem' }}>{t('noNotes')}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QAView;
