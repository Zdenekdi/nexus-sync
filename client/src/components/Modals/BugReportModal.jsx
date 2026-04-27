import React, { useState } from 'react';
import { Bug, X } from 'lucide-react';

const BugReportModal = ({ isOpen, onClose, activeOperator, activeClient, t, lang: _lang }) => {
  const [bugDescription, setBugDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    const subject = encodeURIComponent(`[BUG] Issue reported by ${activeOperator?.name || 'Unknown'}`);
    const body = encodeURIComponent(`Operator: ${activeOperator?.name || 'Unknown'}\nRole: ${activeOperator?.role || 'Unknown'}\nClient: ${activeClient?.name || 'App Owner'}\n\nDescription:\n${bugDescription}`);
    window.location.href = `mailto:support@nexus-hub.ai?subject=${subject}&body=${body}`;
    onClose();
    setBugDescription('');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Bug size={24} color="#ef4444" /> {t('reportBugTitle')}
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          {t('bugReportSubtitle')}
        </p>

        <textarea
          value={bugDescription}
          onChange={(_err) => setBugDescription(_err.target.value)}
          placeholder={t('bugPlaceholder')}
          style={{
            width: '100%', height: '150px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)',
            borderRadius: '12px', padding: '1rem', color: 'white', fontSize: '0.9rem', resize: 'none', marginBottom: '1.5rem',
            outline: 'none'
          }}
        />

        <button
          onClick={handleSubmit}
          className="action-btn"
          style={{ background: 'var(--accent-color)', color: 'white', fontWeight: '800' }}
        >
          {t('reportToGithub')}
        </button>
      </div>
    </div>
  );
};

export default BugReportModal;
