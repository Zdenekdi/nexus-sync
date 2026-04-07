/* src/components/Modals/AddUserModal.jsx */
import React, { useState, useEffect } from 'react';
import { X, UserPlus } from 'lucide-react';
import axios from 'axios';
import { useNexus } from '../../context/NexusContext';

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
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to add user', 'error');
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
              onChange={e => setData({...data, name: e.target.value})} 
              placeholder="e.g. John Doe"
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }} 
            />
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: '600' }}>EMAIL (LOGIN)</div>
            <input 
              type="email" 
              value={data.email} 
              onChange={e => setData({...data, email: e.target.value})} 
              placeholder="manager@agency.com"
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }} 
            />
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: '600' }}>PASSWORD</div>
            <input 
              type="text" // using text so they can see what they generated
              value={data.password} 
              onChange={e => setData({...data, password: e.target.value})} 
              placeholder="Secure password"
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }} 
            />
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
