/* src/components/Modals/AddUserModal.jsx */
import React, { useState, useEffect } from 'react';
import { X, UserPlus } from 'lucide-react';
import axios from 'axios';
import { useNexus } from '../../context/NexusContextCore';

const AddUserModal = ({ isOpen, onClose, t }) => {
  const { API_BASE, token, addUserModalAgencyId, showToast, initData } = useNexus();
  const [data, setData] = useState({
    name: '',
    email: '',
    password: '',
    roleName: 'Agency Admin'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setData({
        name: '',
        email: '',
        password: '',
        roleName: 'Agency Admin'
      });
    }
  }, [isOpen]);
  
  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let pass = '';
    // Ensure at least one uppercase, one lowercase, one number
    pass += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    pass += '0123456789'[Math.floor(Math.random() * 10)];
    pass += '!@#$%'[Math.floor(Math.random() * 5)];
    
    for (let i = 0; i < 9; i++) {
      pass += chars[Math.floor(Math.random() * chars.length)];
    }
    // Shuffle
    pass = pass.split('').sort(() => 0.5 - Math.random()).join('');
    setData({ ...data, password: pass });
  };

  if (!isOpen || !addUserModalAgencyId) return null;

  const handleSubmit = async () => {
    if (!data.name || !data.email || !data.password) {
      showToast('Please fill all fields', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await axios.post(
        `${API_BASE}/agency/users`,
        { ...data, agencyId: addUserModalAgencyId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast('Manager assigned successfully', 'success');
      onClose();
      if (initData) initData();
    } catch (_err) {
      console.error(_err);
      showToast(_err.response?.data?.message || 'Failed to add user', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1005, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)', padding: '1rem' }}>
      <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <UserPlus size={24} color="var(--accent-color)" /> {t('assignManager') || 'Assign Manager'}
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', lineHeight: '1.4' }}>
            This will create a new login account with the "Agency Admin" role, giving them full access to manage this agency.
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: '600' }}>FULL NAME</div>
            <input 
              type="text" 
              value={data.name} 
              onChange={_err => setData({...data, name: _err.target.value})} 
              placeholder="_err.g. John Doe"
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }} 
            />
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: '600' }}>EMAIL (LOGIN)</div>
            <input 
              type="email" 
              value={data.email} 
              onChange={_err => setData({...data, email: _err.target.value})} 
              placeholder="manager@agency.com"
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }} 
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>PASSWORD</div>
              <button 
                onClick={generatePassword}
                style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'var(--accent-color)', padding: '0.2rem 0.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}
              >
                GENERATE
              </button>
            </div>
            <input 
              type="text" 
              value={data.password} 
              onChange={_err => setData({...data, password: _err.target.value})} 
              placeholder="Secure password"
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }} 
            />
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
              Min. 8 chars, 1 uppercase letter, 1 number
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid var(--card-border)', color: 'white', borderRadius: '12px', fontWeight: '700' }}>CANCEL</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="action-btn" style={{ flex: 1, background: 'var(--accent-color)', color: 'white', fontWeight: '800' }}>
            {isSubmitting ? 'CREATING...' : 'CREATE MANAGER'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddUserModal;
