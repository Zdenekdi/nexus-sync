/* src/components/Modals/BookingModal.jsx */
import React from 'react';
import { X } from 'lucide-react';

const BookingModal = ({ isOpen, onClose, form, onFormChange, onSave, lang }) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1002, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '1rem' }}>
      <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '480px', padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: '800' }}>{lang === 'cz' ? 'Přidat akci do kalendáře' : 'Add Booking'}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <input value={form.title} onChange={e => onFormChange({...form, title: e.target.value})} placeholder={lang === 'cz' ? 'např. Schůzka s klientem' : 'e.g. Meeting with client'} style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', borderRadius: '10px', color: 'white' }} />
          <input type="date" value={form.date} onChange={e => onFormChange({...form, date: e.target.value})} style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', borderRadius: '10px', color: 'white', colorScheme: 'dark' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input type="time" value={form.startTime} onChange={e => onFormChange({...form, startTime: e.target.value})} style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', border: '1px solid var(--card-border)', color: 'white', colorScheme: 'dark' }} />
            <input type="time" value={form.endTime} onChange={e => onFormChange({...form, endTime: e.target.value})} style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', border: '1px solid var(--card-border)', color: 'white', colorScheme: 'dark' }} />
          </div>
          <button onClick={onSave} disabled={!form.title || !form.date} className="action-btn" style={{ background: 'var(--accent-color)', color: 'white', fontWeight: '800' }}>{lang === 'cz' ? 'Uložit akci' : 'Save Booking'}</button>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
