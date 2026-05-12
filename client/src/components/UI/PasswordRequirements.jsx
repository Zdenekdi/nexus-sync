import React, { memo } from 'react';

const PasswordRequirements = ({ password, isCz }) => {
  if (!password) return null;
  
  const requirements = [
    { label: isCz ? 'Minimálně 8 znaků' : 'At least 8 characters', met: password.length >= 8 },
    { label: isCz ? 'Aspoň jedno velké písmeno' : 'At least one uppercase letter', met: /[A-Z]/.test(password) },
    { label: isCz ? 'Aspoň jedno číslo' : 'At least one number', met: /[0-9]/.test(password) }
  ];

  const getStrength = () => {
    const metCount = requirements.filter(r => r.met).length;
    if (metCount === 3) return { color: '#10b981', label: isCz ? 'Silné' : 'Strong', width: '100%' };
    if (metCount === 2) return { color: '#f59e0b', label: isCz ? 'Střední' : 'Medium', width: '66%' };
    return { color: '#ef4444', label: isCz ? 'Slabé' : 'Weak', width: '33%' };
  };

  const strength = getStrength();

  return (
    <div style={{ marginTop: '0.75rem', animation: 'fadeInUp 0.3s ease-out' }}>
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginBottom: '0.6rem' }}>
        <div style={{ height: '100%', width: strength.width, background: strength.color, borderRadius: '2px', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }} />
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {requirements.map((req, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
            <div style={{ 
              width: '5px', height: '5px', borderRadius: '50%', 
              background: req.met ? '#10b981' : '#475569',
              boxShadow: req.met ? '0 0 6px #10b981' : 'none',
              transition: 'all 0.3s ease'
            }} />
            <span style={{ 
              color: req.met ? '#10b981' : '#64748b',
              fontWeight: req.met ? '700' : '500',
              opacity: req.met ? 1 : 0.8,
              transition: 'all 0.3s ease'
            }}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default memo(PasswordRequirements);
