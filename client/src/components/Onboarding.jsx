import React, { useState, useRef, useCallback } from 'react';
import { useNexus } from '../context/NexusContext';

const STORAGE_KEY = 'nexus_onboarding_seen';

// Neon glow icons defined at module level for shared access
const Onboarding = () => {
  const { setShowOnboarding, setShowLanding, lang, setHasSeenOnboarding } = useNexus();

  // Moving definitions INSIDE to ensure they are available only after React/Context are ready
  // and to avoid bundling issues with module-level JSX.
  const slides = [
    {
      id: 'relay',
      glowColor: '#3b82f6',
      icon: (
        <svg viewBox="0 0 80 80" width="120" height="120" fill="none">
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
      glowColor: '#8b5cf6',
      icon: (
        <svg viewBox="0 0 80 80" width="120" height="120" fill="none">
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
      glowColor: '#ef4444',
      icon: (
        <svg viewBox="0 0 80 80" width="120" height="120" fill="none">
          <path d="M40 10L15 22v24c0 15 10.5 29 25 34 14.5-5 25-19 25-34V22L40 10z" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
          <path d="M40 28v16" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.9" />
          <circle cx="40" cy="54" r="3" fill="currentColor" fillOpacity="0.9" />
        </svg>
      ),
      titleCz: 'Guardian Suite',
      titleEn: 'Guardian Suite',
      descCz: 'Hands-free bezpečnost. Hlasová aktivace SOS ("Pomoc/SOS") i bez dotyku displeje a diskrétní pípání Audio Sentinelu pro tvůj absolutní klid.',
      descEn: 'Hands-free safety. Trigger SOS by voice ("Help/SOS") even without touching the screen, with discreet Audio Sentinel feedback for your absolute peace of mind.',
    },
    {
      id: 'privacy',
      glowColor: '#10b981',
      icon: (
        <svg viewBox="0 0 80 80" width="120" height="120" fill="none">
          <circle cx="40" cy="35" r="12" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
          <path d="M20 65c0-11 9-20 20-20s20 9 20 20" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
          <rect x="34" y="55" width="12" height="16" rx="2" fill="currentColor" fillOpacity="0.9" />
          <circle cx="40" cy="61" r="1.5" fill="white" />
        </svg>
      ),
      titleCz: 'Anonymita & Soukromí',
      titleEn: 'Privacy First',
      descCz: 'Žádné sdílení osobních údajů. Komunikuj bezpečně přes naši infrastrukturu a chraň si to své.',
      descEn: 'No sharing of personal data. Communicate safely through our infrastructure and protect what is yours.',
    }
  ];
  const onComplete = useCallback(() => {
    setShowOnboarding(false);
    setShowLanding(false);
    setHasSeenOnboarding(true);
  }, [setShowOnboarding, setShowLanding, setHasSeenOnboarding]);

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
  }, [current, goToSlide, slides.length]);

  const handleComplete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onComplete();
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShowLanding(false);
    onComplete();
  }, [onComplete, setShowLanding]);

  const onTouchStart = useCallback((_err) => {
    touchStartX.current = _err.touches[0].clientX;
    touchStartY.current = _err.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback((_err) => {
    if (touchStartX.current === null) return;
    const dx = _err.changedTouches[0].clientX - touchStartX.current;
    const dy = _err.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0 && current < slides.length - 1) {
        next();
      } else if (dx > 0 && current > 0) {
        goToSlide(current - 1);
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, [current, next, goToSlide, slides.length]);

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
        paddingTop: 'env(safe-area-inset-top, 20px)',
        paddingBottom: 'env(safe-area-inset-bottom, 20px)',
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Ambient glow background - Enhanced for more depth */}
      <div
        key={slide.id + '-glow'}
        style={{
          position: 'absolute',
          top: '25%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${slide.glowColor}1a 0%, transparent 80%)`,
          filter: 'blur(80px)',
          pointerEvents: 'none',
          transition: 'background 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />

      {/* Top bar: progress dots + skip */}
      <div style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.5rem 1.8rem 0',
        flexShrink: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {slides.map((s, i) => (
            <div
              key={s.id}
              style={{
                width: i === current ? '32px' : '8px',
                height: '6px',
                borderRadius: '3px',
                background: i === current ? slide.glowColor : 'rgba(255,255,255,0.1)',
                boxShadow: i === current ? `0 0 10px ${slide.glowColor}` : 'none',
                transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            />
          ))}
        </div>
        <button
          onClick={handleSkip}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '0.75rem',
            fontWeight: '700',
            cursor: 'pointer',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
          }}
        >
          {isCz ? 'PŘESKOČIT' : 'SKIP'}
        </button>
      </div>

      {/* Main content - Optimized Spacing */}
      <div
        key={slide.id}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 2.5rem',
          textAlign: 'center',
          opacity: animating ? 0 : 1,
          transform: animating ? 'translateY(10px)' : 'translateY(0)',
          transition: 'opacity 0.3s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          gap: '0'
        }}
      >
        {/* Icon with persistent glow */}
        <div style={{
          color: slide.glowColor,
          filter: `drop-shadow(0 0 30px ${slide.glowColor}aa)`,
          marginBottom: '3rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {slide.icon}
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '2.4rem',
          fontWeight: '900',
          color: 'white',
          margin: '0 0 1.25rem',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          textShadow: '0 2px 10px rgba(0,0,0,0.5)'
        }}>
          {isCz ? slide.titleCz : slide.titleEn}
        </h1>

        {/* Description */}
        <p style={{
          fontSize: '1.05rem',
          color: 'rgba(255,255,255,0.5)',
          lineHeight: 1.6,
          maxWidth: '300px',
          margin: 0,
          fontWeight: '400'
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
            data-testid="onboarding-finish"
            id="onboarding-finish"
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
            onTouchStart={_err => _err.currentTarget.style.transform = 'scale(0.97)'}
            onTouchEnd={_err => _err.currentTarget.style.transform = 'scale(1)'}
          >
            {isCz ? 'Vstoupit do aplikace →' : 'Enter Application →'}
          </button>
        ) : (
          <button
            onClick={next}
            data-testid="onboarding-next"
            id="onboarding-next"
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
            onTouchStart={_err => _err.currentTarget.style.opacity = '0.7'}
            onTouchEnd={_err => _err.currentTarget.style.opacity = '1'}
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
