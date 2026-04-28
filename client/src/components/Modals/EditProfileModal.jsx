/* src/components/Modals/EditProfileModal.jsx */
import React from 'react';
import { X, Upload } from 'lucide-react';

const EditProfileModal = ({ isOpen, onClose, data, onDataChange, onSave, t, lang: _lang, isMobile: _isMobile }) => {
  if (!isOpen || !data) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '1rem' }}>
      <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '600px', padding: '2.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '900' }}>{t('editProfile')}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Název profilu</label>
            <input type="text" value={data.name} onChange={_err => onDataChange({...data, name: _err.target.value})} placeholder={t('profileName')} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Telefonní číslo</label>
            <input type="text" value={data.phoneNumber || ''} onChange={_err => onDataChange({...data, phoneNumber: _err.target.value})} placeholder={t('phoneNumber')} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Provize modelky (%)</label>
            <input type="number" min="0" max="100" value={data.commission ?? 50} onChange={_err => onDataChange({...data, commission: _err.target.value})} placeholder="Provize v %" style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: '800', color: '#a78bfa', textTransform: 'uppercase' }}>AI Tréninková historie (Vložit vzorové zprávy)</label>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', color: '#a78bfa', background: 'rgba(167, 139, 250, 0.1)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(167, 139, 250, 0.3)' }}>
                <Upload size={12} /> {t('uploadFile') || 'Nahrát soubor'}
                <input 
                  type="file" 
                  accept=".txt,.csv,.json" 
                  style={{ display: 'none' }} 
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      onDataChange({...data, sampleMessages: ev.target.result});
                    };
                    reader.readAsText(file);
                  }}
                />
              </label>
            </div>
            <textarea 
              value={data.sampleMessages || ''} 
              onChange={_err => onDataChange({...data, sampleMessages: _err.target.value})} 
              placeholder="Vložte sem ukázky zpráv od modelky, nebo nahrajte soubor s exportem chatu..." 
              style={{ width: '100%', minHeight: '120px', background: 'rgba(167, 139, 250, 0.05)', border: '1px solid rgba(167, 139, 250, 0.2)', padding: '0.85rem', borderRadius: '12px', color: 'white', fontSize: '0.85rem', resize: 'vertical' }} 
            />
            <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Podporované formáty: .txt, .csv, .json. Tip: Vložte aspoň 10-20 zpráv.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid var(--card-border)', color: 'white', borderRadius: '12px', fontWeight: '700' }}>{t('cancel')}</button>
          <button onClick={onSave} className="action-btn" style={{ flex: 1, background: 'var(--accent-color)', color: 'white', fontWeight: '800' }}>{t('saveProfileChanges')}</button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
