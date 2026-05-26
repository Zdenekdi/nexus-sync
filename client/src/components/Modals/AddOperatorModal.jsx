/* src/components/Modals/AddOperatorModal.jsx */
import React from 'react';
import { X } from 'lucide-react';
import PremiumSelector from '../UI/PremiumSelector';

const AddOperatorModal = ({ isOpen, onClose, data, onDataChange, onAdd, t, lang, activeRole, activeOperator }) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '1rem' }}>
      <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '900' }}>{t('addTeamMember')}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <input type="text" value={data.name} onChange={_err => onDataChange({...data, name: _err.target.value})} placeholder={t('fullName')} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }} />
          <input type="email" value={data.email} onChange={_err => onDataChange({...data, email: _err.target.value})} placeholder={t('emailAddress')} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }} />
          <PremiumSelector
            options={[
              { id: 'Model', name: lang === 'cz' ? 'Modelka' : 'Model' },
              { id: 'Operator', name: lang === 'cz' ? 'Operátorka' : 'Operator' },
              { id: 'Senior Operator', name: 'Senior Operator' },
              { id: 'Agency Manager', name: lang === 'cz' ? 'Manažer agentury' : 'Agency Manager' },
              ...((activeRole === 'app_owner' || activeOperator?.isManager || activeOperator?.isSeniorOperator) ? [{ id: 'Agency Admin', name: 'Agency Admin' }] : [])
            ]}
            value={data.role}
            onChange={val => onDataChange({...data, role: val})}
            placeholder={lang === 'cz' ? 'Vyberte roli' : 'Select role'}
          />
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid var(--card-border)', color: 'white', borderRadius: '12px', fontWeight: '700' }}>{t('cancel')}</button>
          <button onClick={onAdd} className="action-btn" style={{ flex: 1, background: 'var(--accent-color)', color: 'white', fontWeight: '800' }}>{t('addToTeam')}</button>
        </div>
      </div>
    </div>
  );
};

export default AddOperatorModal;
