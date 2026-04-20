import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, User } from 'lucide-react';

/**
 * PremiumSelector - A high-end custom dropdown component
 * Replaces native selects to avoid rendering issues in mobile/emulator environments.
 */
const PremiumSelector = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = 'Select profile...', 
  showAllOption = false,
  allLabel = 'All Profiles',
  style = {},
  isMobile = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find(opt => opt.id === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (id) => {
    onChange(id);
    setIsOpen(false);
  };

  return (
    <div className="premium-selector-container" ref={dropdownRef} style={{ position: 'relative', width: '100%', ...style }}>
      {/* Trigger Button */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--card-border)',
          borderRadius: '12px',
          padding: '0.6rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? '0 0 0 2px var(--accent-color)' : 'none',
          minHeight: '44px'
        }}
        className="premium-selector-trigger"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
          {value === 'all' ? (
            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>📦</div>
          ) : selectedOption?.avatar ? (
            <img src={selectedOption.avatar} alt="" style={{ width: '24px', height: '24px', borderRadius: '6px', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={14} />
            </div>
          )}
          <span style={{ fontSize: '0.85rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {value === 'all' ? allLabel : (selectedOption?.name || placeholder)}
          </span>
        </div>
        <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--text-secondary)' }} />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="fade-in custom-scrollbar"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            background: '#12141c',
            border: '1px solid var(--card-border)',
            borderRadius: '14px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            zIndex: 1000,
            maxHeight: '280px',
            overflowY: 'auto',
            padding: '0.5rem'
          }}
        >
          {showAllOption && (
            <div 
              onClick={() => handleSelect('all')}
              style={{
                padding: '0.75rem 0.85rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                background: value === 'all' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                marginBottom: '4px',
                transition: 'background 0.2s'
              }}
              className="option-item"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📥</div>
                <span style={{ fontSize: '0.85rem', fontWeight: value === 'all' ? '800' : '600', color: value === 'all' ? 'var(--accent-color)' : 'white' }}>{allLabel}</span>
              </div>
              {value === 'all' && <Check size={16} color="var(--accent-color)" />}
            </div>
          )}

          {options.map((opt) => (
            <div 
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              style={{
                padding: '0.75rem 0.85rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                background: value === opt.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                marginBottom: '4px',
                transition: 'background 0.2s'
              }}
              className="option-item"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {opt.avatar ? (
                  <img src={opt.avatar} alt="" style={{ width: '28px', height: '28px', borderRadius: '8px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={16} />
                  </div>
                )}
                <span style={{ fontSize: '0.85rem', fontWeight: value === opt.id ? '800' : '600', color: value === opt.id ? 'var(--accent-color)' : 'white' }}>{opt.name}</span>
              </div>
              {value === opt.id && <Check size={16} color="var(--accent-color)" />}
            </div>
          ))}

          {options.length === 0 && !showAllOption && (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No profiles available</div>
          )}
        </div>
      )}
    </div>
  );
};

export default PremiumSelector;
