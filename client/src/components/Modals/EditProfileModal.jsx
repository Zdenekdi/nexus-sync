/* src/components/Modals/EditProfileModal.jsx */
import React from 'react';
import { X } from 'lucide-react';

const EditProfileModal = ({ isOpen, onClose, data, onDataChange, onSave, t, lang, isMobile }) => {
  if (!isOpen || !data) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '1rem' }}>
      <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '600px', padding: '2.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '900' }}>{t('editProfile')}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <input type="text" value={data.name} onChange={e => onDataChange({...data, name: e.target.value})} placeholder={t('profileName')} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }} />
          <input type="text" value={data.phoneNumber || ''} onChange={e => onDataChange({...data, phoneNumber: e.target.value})} placeholder={t('phoneNumber')} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }} />
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
