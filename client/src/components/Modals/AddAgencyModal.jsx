/* src/components/Modals/AddAgencyModal.jsx */
import React from 'react';
import { X } from 'lucide-react';

const CONTINENTS = {
  'Europe': ['United Kingdom', 'Czech Republic', 'Slovakia', 'Germany', 'Austria', 'France', 'Spain', 'Italy', 'Poland', 'Netherlands', 'Other'],
  'North America': ['United States', 'Canada', 'Mexico', 'Other'],
  'South America': ['Brazil', 'Argentina', 'Colombia', 'Chile', 'Other'],
  'Asia': ['United Arab Emirates', 'Saudi Arabia', 'Japan', 'South Korea', 'India', 'Thailand', 'Other'],
  'Africa': ['South Africa', 'Nigeria', 'Egypt', 'Kenya', 'Other'],
  'Australia & Oceania': ['Australia', 'New Zealand', 'Other'],
  'International / Global': ['Global Scope']
};

const AddAgencyModal = ({ isOpen, onClose, token: _token, onAdd, t }) => {
  const [data, setData] = React.useState({
    name: '',
    continent: 'Europe',
    country: 'United Kingdom',
    tier: 'Standard',
    email: ''
  });


  if (!isOpen) return null;

  const handleSubmit = () => {
    const formattedRegion = data.continent === 'International / Global' 
       ? 'Global Scope' 
       : `${data.continent} - ${data.country}`;
       
    onAdd({
      name: data.name,
      region: formattedRegion,
      tier: data.tier,
      email: data.email
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '1rem' }}>
      <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '450px', padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '900' }}>{t('provisionAgency') || 'Provision New Agency'}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <input type="text" value={data.name} onChange={_err => setData({...data, name: _err.target.value})} placeholder={t('agencyName') || 'Agency Name'} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }} />
          
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: '600' }}>CONTINENT / REGION</div>
              <select 
                value={data.continent} 
                onChange={_err => {
                  const newContinent = _err.target.value;
                  setData({...data, continent: newContinent, country: CONTINENTS[newContinent][0]});
                }} 
                style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }}
              >
                {Object.keys(CONTINENTS).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: '600' }}>COUNTRY</div>
              <select 
                value={data.country} 
                onChange={_err => setData({...data, country: _err.target.value})} 
                style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }}
              >
                {CONTINENTS[data.continent].map(country => (
                   <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: '600' }}>SUBSCRIPTION PLAN</div>
            <select value={data.tier} onChange={_err => setData({...data, tier: _err.target.value})} style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }}>
              <option value="Standard">Standard</option>
              <option value="Professional">Professional</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </div>
          
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: '600' }}>AGENCY EMAIL (Optional)</div>
            <input type="email" value={data.email} onChange={_err => setData({...data, email: _err.target.value})} placeholder="contact@agency.com" style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }} />
          </div>
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
