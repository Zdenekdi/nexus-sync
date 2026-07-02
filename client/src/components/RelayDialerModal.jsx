import React, { useState } from 'react';
import { Phone, X, Delete } from 'lucide-react';
import { App } from '@capacitor/app';

const RelayDialerModal = ({ isOpen, onClose }) => {
  const [number, setNumber] = useState('');

  if (!isOpen) return null;

  const handleDial = async () => {
    if (number.trim()) {
      try {
        await App.openUrl({ url: `tel:${number}` });
      } catch {
        // Fallback for web/dev
        window.location.href = `tel:${number}`;
      }
    }
  };

  const pad = [
    ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
    ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
    ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
    ['*', ''], ['0', '+'], ['#', '']
  ];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh',
      background: 'rgba(2, 6, 23, 0.95)', backdropFilter: 'blur(10px)',
      display: 'flex', flexDirection: 'column', zIndex: 99999,
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{ padding: '2rem 1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
          width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', cursor: 'pointer'
        }}>
          <X size={24} />
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '3rem' }}>
        <div style={{ 
          fontSize: '2.5rem', fontWeight: '400', color: 'white', 
          minHeight: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '2rem', letterSpacing: '2px', wordBreak: 'break-all', padding: '0 2rem'
        }}>
          {number || ' '}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', width: '100%', maxWidth: '320px', padding: '0 1rem' }}>
          {pad.map(([num, letters]) => (
            <button 
              key={num}
              onClick={() => setNumber(n => n + num)}
              style={{
                background: 'rgba(255,255,255,0.05)', border: 'none',
                width: '100%', aspectRatio: '1/1', borderRadius: '50%',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                color: 'white', cursor: 'pointer', transition: 'background 0.2s'
              }}
            >
              <span style={{ fontSize: '1.75rem', fontWeight: '400', lineHeight: 1 }}>{num}</span>
              {letters && <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.2rem', letterSpacing: '1px' }}>{letters}</span>}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '320px', padding: '0 2rem', marginTop: '2rem' }}>
          <div style={{ width: '48px' }}></div>
          <button 
            onClick={handleDial}
            style={{
              background: '#22c55e', border: 'none',
              width: '72px', height: '72px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(34, 197, 94, 0.4)'
            }}
          >
            <Phone size={32} fill="currentColor" />
          </button>
          <button 
            onClick={() => setNumber(n => n.slice(0, -1))}
            style={{
              background: 'transparent', border: 'none',
              width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: number ? 'white' : 'transparent', cursor: number ? 'pointer' : 'default',
              transition: 'color 0.2s'
            }}
          >
            <Delete size={28} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RelayDialerModal;
