/* src/components/Modals/BookingModal.jsx */
import React from 'react';
import { X, MapPin, Home, Car } from 'lucide-react';

const BookingModal = ({ isOpen, onClose, form, onFormChange, onSave, lang }) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1002, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '1rem' }}>
      <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '480px', padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: '800' }}>{lang === 'cz' ? 'Nová rezervace' : 'New Booking'}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Location Type Selector */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              onClick={() => onFormChange({...form, locationType: 'incall'})}
              style={{ 
                flex: 1, 
                padding: '0.85rem', 
                borderRadius: '12px', 
                border: '1px solid',
                borderColor: form.locationType === 'incall' ? 'var(--accent-color)' : 'var(--card-border)',
                background: form.locationType === 'incall' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)',
                color: form.locationType === 'incall' ? 'white' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Home size={16} /> {lang === 'cz' ? 'Incall' : 'Incall'}
            </button>
            <button 
              onClick={() => onFormChange({...form, locationType: 'outcall'})}
              style={{ 
                flex: 1, 
                padding: '0.85rem', 
                borderRadius: '12px', 
                border: '1px solid',
                borderColor: form.locationType === 'outcall' ? 'var(--warning-color)' : 'var(--card-border)',
                background: form.locationType === 'outcall' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.02)',
                color: form.locationType === 'outcall' ? 'white' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Car size={16} /> {lang === 'cz' ? 'Outcall' : 'Outcall'}
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <input 
              value={form.title} 
              onChange={e => onFormChange({...form, title: e.target.value})} 
              placeholder={lang === 'cz' ? 'Název schůzky (jméno klienta)' : 'Booking title (client name)'} 
              style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'white', fontSize: '0.95rem' }} 
            />
          </div>

          {form.locationType === 'outcall' && (
            <div className="fade-in" style={{ position: 'relative' }}>
              <MapPin size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--warning-color)', opacity: 0.8 }} />
              <input 
                value={form.address || ''} 
                onChange={e => onFormChange({...form, address: e.target.value})} 
                placeholder={lang === 'cz' ? 'Adresa výjezdu (ulice, město...)' : 'Outcall address (street, city...)'} 
                style={{ 
                  width: '100%', 
                  padding: '1rem 1rem 1rem 3rem', 
                  background: 'rgba(245, 158, 11, 0.05)', 
                  border: '1px solid rgba(245, 158, 11, 0.2)', 
                  borderRadius: '14px', 
                  color: 'white', 
                  fontSize: '1rem',
                  outline: 'none',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s'
                }} 
              />
            </div>
          )}

          <div style={{ position: 'relative' }}>
             <input type="date" value={form.date} onChange={e => onFormChange({...form, date: e.target.value})} style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'white', colorScheme: 'dark' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input type="time" value={form.startTime} onChange={e => onFormChange({...form, startTime: e.target.value})} style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--card-border)', color: 'white', colorScheme: 'dark' }} />
            <input type="time" value={form.endTime} onChange={e => onFormChange({...form, endTime: e.target.value})} style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--card-border)', color: 'white', colorScheme: 'dark' }} />
          </div>

          <button 
            onClick={onSave} 
            disabled={!form.title || !form.date || (form.locationType === 'outcall' && !form.address)} 
            className="action-btn" 
            style={{ 
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: '14px',
              background: 'var(--accent-color)', 
              color: 'white', 
              fontWeight: '800',
              fontSize: '1rem',
              boxShadow: '0 10px 20px rgba(59, 130, 246, 0.2)'
            }}
          >
            {lang === 'cz' ? 'Uložit rezervaci' : 'Save Booking'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
