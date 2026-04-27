/* src/components/Modals/AgencyDetailModal.jsx */
import React, { useState } from 'react';
import { X, Shield, ShieldCheck, Copy, Edit2, Check } from 'lucide-react';
import axios from 'axios';
import { useNexus } from '../../context/NexusContextCore';

const CONTINENTS = {
  'Europe': ['United Kingdom', 'Czech Republic', 'Slovakia', 'Germany', 'Austria', 'France', 'Spain', 'Italy', 'Poland', 'Netherlands', 'Other'],
  'North America': ['United States', 'Canada', 'Mexico', 'Other'],
  'South America': ['Brazil', 'Argentina', 'Colombia', 'Chile', 'Other'],
  'Asia': ['United Arab Emirates', 'Saudi Arabia', 'Japan', 'South Korea', 'India', 'Thailand', 'Other'],
  'Africa': ['South Africa', 'Nigeria', 'Egypt', 'Kenya', 'Other'],
  'Australia & Oceania': ['Australia', 'New Zealand', 'Other'],
  'International / Global': ['Global Scope']
};

const AgencyDetailModal = ({ 
  agency, 
  onClose, 
  onManageRoles, 
  operators, 
  showToast, 
  lang: _lang 
}) => {
  const { API_BASE, token, setAgencyDetailModalData, setIsAddUserOpen, setAddUserModalAgencyId, initData } = useNexus();
  const [isEditing, setIsEditing] = useState(false);
  const [editEmail, setEditEmail] = useState(agency?.email || '');
  
  const initialRegionParts = agency?.region ? agency.region.split(' - ').map(s => s.trim()) : ['Europe', 'United Kingdom'];
  const [editContinent, setEditContinent] = useState(CONTINENTS[initialRegionParts[0]] ? initialRegionParts[0] : (agency?.region === 'Global Scope' ? 'International / Global' : 'Europe'));
  const [editCountry, setEditCountry] = useState(initialRegionParts[1] || 'United Kingdom');

  const [isSaving, setIsSaving] = useState(false);

  if (!agency) return null;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const formattedRegion = editContinent === 'International / Global' 
        ? 'Global Scope' 
        : `${editContinent} - ${editCountry}`;
        
      await axios.patch(`${API_BASE}/agency/settings`, {
        agencyId: agency.id,
        email: editEmail,
        region: formattedRegion
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Agency info updated', 'success');
      setAgencyDetailModalData({ ...agency, email: editEmail, region: formattedRegion });
      setIsEditing(false);
      if (initData) initData();
    } catch (_err) {
      console.error('Failed to update agency:', _err);
      showToast('Failed to update agency', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1002, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)', padding: '1rem' }}>
      <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '2rem 2.5rem 1.5rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '0.25rem' }}>
              {agency.name}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {isEditing ? (
                    <input 
                      type="email" 
                      value={editEmail} 
                      onChange={_err => setEditEmail(_err.target.value)} 
                      placeholder="Agency Email"
                      style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--accent-color)', color: 'white', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', width: '200px' }}
                    />
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                      {agency.email || 'No agency email'}
                    </span>
                  )}
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <select 
                        value={editContinent} 
                        onChange={_err => {
                          const newContinent = _err.target.value;
                          setEditContinent(newContinent);
                          setEditCountry(CONTINENTS[newContinent][0]);
                        }} 
                        style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--accent-color)', color: 'white', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', width: '120px' }}
                      >
                        {Object.keys(CONTINENTS).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select 
                        value={editCountry} 
                        onChange={_err => setEditCountry(_err.target.value)} 
                        style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--accent-color)', color: 'white', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', width: '120px' }}
                      >
                        {CONTINENTS[editContinent]?.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', letterSpacing: '0.05em' }}>
                      {agency.region?.toUpperCase() || 'UNKNOWN REGION'}
                    </div>
                  )}
                </div>
              {isEditing ? (
                <button onClick={handleSave} disabled={isSaving} style={{ background: 'var(--success-color)', border: 'none', borderRadius: '6px', color: 'white', padding: '0.3rem 0.5rem', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <Check size={14} />
                </button>
              ) : (
                <button onClick={() => setIsEditing(true)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', padding: '0.2rem' }}>
                  <Edit2 size={14} />
                </button>
              )}
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>SUBSCRIPTION</div>
              <div style={{ fontWeight: '700' }}>{agency.subscription?.plan || 'Standard'}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>TEAM SIZE</div>
              <div style={{ fontWeight: '700' }}>{operators.filter(o => o.agencyId === agency.id).length} Active</div>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>PRIMARY MANAGER</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '800' }}>
                  {agency.managerName?.charAt(0) || 'M'}
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{agency.managerName || 'N/A'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{agency.managerEmail || 'No contact provided'}</div>
                </div>
              </div>
            </div>
            
            {(!agency.managerName || agency.managerName === 'N/A') && (
              <button
                onClick={() => {
                  setAddUserModalAgencyId(agency.id);
                  setIsAddUserOpen(true);
                  onClose();
                }}
                style={{
                  background: 'var(--accent-color)',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                + ADD MANAGER
              </button>
            )}
          </div>

          <button 
            onClick={onManageRoles}
            className="action-btn"
            style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid var(--accent-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontWeight: '800', width: '100%', padding: '1rem', borderRadius: '12px' }}
          >
            <Shield size={18} color="var(--accent-color)" /> MANAGE ROLE PERMISSIONS
          </button>

          <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(37,99,235,0.05))', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '16px', padding: '1.5rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <ShieldCheck size={14} color="var(--accent-color)" />
              <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--accent-color)', letterSpacing: '0.1em' }}>INVITATION CODE</div>
            </div>
            {agency.inviteCode ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <code style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px', fontSize: '1.2rem', fontWeight: '900', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '54px', boxSizing: 'border-box' }}>{agency.inviteCode}</code>
                <button onClick={() => { navigator.clipboard.writeText(agency.inviteCode); showToast('Copied!', 'success'); }} style={{ padding: '0 1.25rem', height: '54px', minWidth: '54px', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>
                  <Copy size={18} />
                </button>
              </div>
            ) : <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Code not generated</div>}
          </div>
        </div>

        <div style={{ padding: '1.5rem 2.5rem 2rem', borderTop: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)' }}>
          <button onClick={onClose} style={{ width: '100%', padding: '1rem', background: 'transparent', border: '1px solid var(--card-border)', color: 'white', borderRadius: '12px', fontWeight: '700' }}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgencyDetailModal;
