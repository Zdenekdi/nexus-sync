/* src/components/Modals/AddAgencyModal.jsx */
import React from 'react';
import { X } from 'lucide-react';

const AddAgencyModal = ({ isOpen, onClose, token: _token, onAdd, t }) => {
  const [data, setData] = React.useState({
    name: '',
    region: 'UK/Europe',
    tier: 'Standard',
    email: ''
  });

  if (!isOpen) return null;

  const handleSubmit = () => {
    onAdd(data);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '1rem' }}>
      <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '900' }}>{t('provisionAgency') || 'Provision New Agency'}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <input type="text" value={data.name} onChange={e => setData({...data, name: e.target.value})} placeholder={t('agencyName') || 'Agency Name'} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }} />
          <select value={data.region} onChange={e => setData({...data, region: e.target.value})} style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }}>
            <option value="UK/Europe">UK/Europe</option>
            <option value="International">International</option>
            <option value="US/North America">US/North America</option>
          </select>
          <select value={data.tier} onChange={e => setData({...data, tier: e.target.value})} style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }}>
            <option value="Standard">Standard</option>
            <option value="Professional">Professional</option>
            <option value="Enterprise">Enterprise</option>
          </select>
          <input type="email" value={data.email} onChange={e => setData({...data, email: e.target.value})} placeholder="Email" style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }} />
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid var(--card-border)', color: 'white', borderRadius: '12px', fontWeight: '700' }}>CANCEL</button>
          <button onClick={handleSubmit} className="action-btn" style={{ flex: 1, background: 'var(--accent-color)', color: 'white', fontWeight: '800' }}>PROVISION</button>
        </div>
      </div>
    </div>
  );
};

export default AddAgencyModal;
