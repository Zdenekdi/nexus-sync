import React, { useState, useRef, useCallback } from 'react';

// Neon glow icons rendered as SVG for maximum visual impact
const slides = [
  {
    id: 'relay',
    gradient: 'rgba(59,130,246,0.15)',
    glowColor: '#3b82f6',
    icon: (
      <svg viewBox="0 0 80 80" width="120" height="120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="40" r="38" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
        <path d="M28 52V28L52 40L28 52Z" fill="currentColor" fillOpacity="0.9" />
        <path d="M54 28v24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.9" />
      </svg>
    ),
    titleCz: 'SMS Relay',
    titleEn: 'SMS Relay',
    descCz: 'Přeposílej zprávy automaticky i se zhasnutým displejem. WakeLock zajistí, že relay nikdy nevypadne.',
    descEn: 'Forward messages automatically even with the screen off. WakeLock ensures relay never drops.',
  },
  {
    id: 'inbox',
    gradient: 'rgba(139,92,246,0.15)',
    glowColor: '#8b5cf6',
    icon: (
      <svg viewBox="0 0 80 80" width="120" height="120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="18" width="60" height="44" rx="8" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
        <path d="M10 26l30 22 30-22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.9" />
        <circle cx="58" cy="22" r="8" fill="currentColor" fillOpacity="0.9" />
        <text x="55" y="26" fill="white" fontSize="10" fontWeight="bold">AI</text>
      </svg>
    ),
    titleCz: 'Inbox & AI Replies',
    titleEn: 'Inbox & AI Replies',
    descCz: 'Všechny konverzace na jednom místě. AI Smart Replies odpoví za tebe nebo návrhem zkrotí každý chat.',
    descEn: 'All conversations in one place. AI Smart Replies answer for you or suggest the perfect response.',
  },
  {
    id: 'safety',
    gradient: 'rgba(239,68,68,0.12)',
    glowColor: '#ef4444',
    icon: (
      <svg viewBox="0 0 80 80" width="120" height="120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M40 8L12 20v20c0 16 12 30 28 34 16-4 28-18 28-34V20L40 8z" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" fill="currentColor" fillOpacity="0.08" />
        <path d="M40 8L12 20v20c0 16 12 30 28 34 16-4 28-18 28-34V20L40 8z" stroke="currentColor" strokeWidth="2" strokeOpacity="0.9" fill="none" />
        <path d="M32 40l6 6 12-12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9" />
      </svg>
    ),
    titleCz: 'Safety Guard',
    titleEn: 'Safety Guard',
    descCz: 'SOS tlačítko, GPS tracking a nouzové alerty chrání celý tým v terénu. Stiskni a pomoc přijde.',
    descEn: 'SOS button, GPS tracking and emergency alerts protect your whole team in the field.',
  },
  {
    id: 'push',
    gradient: 'rgba(16,185,129,0.12)',
    glowColor: '#10b981',
    icon: (
      <svg viewBox="0 0 80 80" width="120" height="120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M40 12C27 12 17 22 17 35v18l-5 8h56l-5-8V35c0-13-10-23-23-23z" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" fill="currentColor" fillOpacity="0.08" />
        <path d="M40 12C27 12 17 22 17 35v18l-5 8h56l-5-8V35c0-13-10-23-23-23z" stroke="currentColor" strokeWidth="2" strokeOpacity="0.9" fill="none" />
        <path d="M34 63c0 3.3 2.7 6 6 6s6-2.7 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.9" />
        <circle cx="56" cy="18" r="7" fill="currentColor" fillOpacity="0.9" />
      </svg>
    ),
    titleCz: 'Push Notifikace',
    titleEn: 'Push Notifications',
    descCz: 'Okamžitá upozornění na nové zprávy, schůzky a nouzové situace — i když je aplikace zavřená.',
    descEn: 'Instant alerts for new messages, bookings and emergencies — even when the app is closed.',
  },
];

import { useNexus } from '../context/NexusContext';

const STORAGE_KEY = 'nexus_onboarding_seen';

const Onboarding = () => {
  const { setShowOnboarding, lang } = useNexus();
  
  const onComplete = () => setShowOnboarding(false);
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const containerRef = useRef(null);

  const goToSlide = useCallback((index) => {
    if (index === current || animating) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent(index);
      setAnimating(false);
    }, 200);
  }, [current, animating]);

  const next = useCallback(() => {
    if (current < slides.length - 1) {
      goToSlide(current + 1);
    }
  }, [current, goToSlide]);

  const handleComplete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onComplete();
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onComplete();
  }, [onComplete]);

  const onTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0 && current < slides.length - 1) {
        next();
      } else if (dx > 0 && current > 0) {
        goToSlide(current - 1);
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, [current, next, goToSlide]);

  const slide = slides[current];
  const isLast = current === slides.length - 1;
  const isCz = lang === 'cz';

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#080a0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Ambient glow background */}
      <div
        key={slide.id + '-glow'}
        style={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${slide.glowColor}22 0%, transparent 70%)`,
          filter: 'blur(60px)',
          pointerEvents: 'none',
          transition: 'background 0.5s ease',
        }}
      />

      {/* Top bar: progress dots + skip */}
      <div style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.2rem 1.5rem 0',
        flexShrink: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => i <= current && goToSlide(i)}
              style={{
                width: i === current ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: i <= current ? slide.glowColor : 'rgba(255,255,255,0.15)',
                border: 'none',
                padding: 0,
                cursor: i < current ? 'pointer' : 'default',
                transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
              }}
            />
          ))}
        </div>
        <button
          onClick={handleSkip}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.35)',
            fontSize: '0.82rem',
            fontWeight: '600',
            cursor: 'pointer',
            padding: '0.25rem 0',
          }}
        >
          {isCz ? 'Přeskočit' : 'Skip'}
        </button>
      </div>

      {/* Main content */}
      <div
        key={slide.id}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 2.5rem',
          textAlign: 'center',
          opacity: animating ? 0 : 1,
          transform: animating ? 'scale(0.97)' : 'scale(1)',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
          gap: '0',
        }}
      >
        {/* Icon */}
        <div style={{
          color: slide.glowColor,
          filter: `drop-shadow(0 0 24px ${slide.glowColor}88)`,
          marginBottom: '2.5rem',
        }}>
          {slide.icon}
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '900',
          color: 'white',
          margin: '0 0 1.25rem',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}>
          {isCz ? slide.titleCz : slide.titleEn}
        </h1>

        {/* Description */}
        <p style={{
          fontSize: '1rem',
          color: 'rgba(255,255,255,0.5)',
          lineHeight: 1.65,
          maxWidth: '320px',
          margin: 0,
        }}>
          {isCz ? slide.descCz : slide.descEn}
        </p>
      </div>

      {/* Bottom action area */}
      <div style={{
        width: '100%',
        padding: '0 2rem 2.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem',
        flexShrink: 0,
        zIndex: 10,
      }}>
        {isLast ? (
          <button
            onClick={handleComplete}
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: '14px',
              border: 'none',
              background: `linear-gradient(135deg, ${slide.glowColor}, #3b82f6)`,
              color: 'white',
              fontWeight: '900',
              fontSize: '1.05rem',
              cursor: 'pointer',
              boxShadow: `0 8px 30px ${slide.glowColor}55`,
              letterSpacing: '0.01em',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {isCz ? 'Vstoupit do aplikace →' : 'Enter Application →'}
          </button>
        ) : (
          <button
            onClick={next}
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: '14px',
              border: `1.5px solid ${slide.glowColor}44`,
              background: `${slide.glowColor}14`,
              color: slide.glowColor,
              fontWeight: '800',
              fontSize: '1rem',
              cursor: 'pointer',
              letterSpacing: '0.01em',
              transition: 'all 0.15s ease',
            }}
            onTouchStart={e => e.currentTarget.style.opacity = '0.7'}
            onTouchEnd={e => e.currentTarget.style.opacity = '1'}
          >
            {isCz ? 'Pokračovat →' : 'Continue →'}
          </button>
        )}

        <p style={{
          margin: 0,
          fontSize: '0.72rem',
          color: 'rgba(255,255,255,0.2)',
          letterSpacing: '0.05em',
        }}>
          {current + 1} / {slides.length}
        </p>
      </div>
    </div>
  );
};

export { STORAGE_KEY as ONBOARDING_STORAGE_KEY };
export default Onboarding;
