import React, { memo } from 'react';
import { 
  Shield, BarChart3, Globe, ChevronLeft
} from 'lucide-react';
import { useNexus } from '../context/ContextHook';

const STYLES = {
  page: { 
    minHeight: '100dvh', 
    width: '100vw', 
    background: '#040507', 
    display: 'flex', 
    flexDirection: 'row', 
    overflow: 'hidden',
    fontFamily: 'Inter, sans-serif'
  },
  leftSide: {
    flex: 1.2,
    background: 'linear-gradient(135deg, #080a0f 0%, #111827 100%)',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '4rem',
    borderRight: '1px solid rgba(255,255,255,0.05)',
    overflow: 'hidden'
  },
  rightSide: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem',
    background: '#040507',
    position: 'relative',
    zIndex: 10
  },
  glow: {
    position: 'absolute',
    width: '600px',
    height: '600px',
    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15), transparent 70%)',
    filter: 'blur(80px)',
    pointerEvents: 'none',
    zIndex: 0
  },
  formContainer: {
    width: '100%',
    maxWidth: '460px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    animation: 'fadeInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    marginBottom: '2.5rem',
    color: 'rgba(255,255,255,0.6)',
    animation: 'fadeInLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1) both'
  }
};

const FeatureItem = ({ icon: Icon, title, desc, delay }) => (
  <div style={{ ...STYLES.featureItem, animationDelay: `${delay}s` }}>
    <div style={{ 
      width: '56px', height: '56px', borderRadius: '16px', 
      background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6'
    }}>
      <Icon size={28} />
    </div>
    <div>
      <div style={{ color: 'white', fontWeight: '800', fontSize: '1.1rem', marginBottom: '0.2rem' }}>{title}</div>
      <div style={{ fontSize: '0.9rem', opacity: 0.6, lineHeight: 1.4 }}>{desc}</div>
    </div>
  </div>
);

const AuthLayout = ({ children, title, subtitle }) => {
  const { lang, isMobile, setShowLanding } = useNexus();
  const isCz = lang === 'cz';

  if (isMobile) {
    return (
      <div style={{ ...STYLES.page, flexDirection: 'column', overflow: 'auto', background: '#040507' }}>
        <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
          <img src="/nexus_icon.png" alt="Nexus" style={{ width: '56px', borderRadius: '14px', marginBottom: '1.5rem', boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)' }} />
          <h1 style={{ color: 'white', fontSize: '1.75rem', fontWeight: '950', margin: 0, letterSpacing: '-0.02em' }}>Nexus Hub</h1>
          {subtitle && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginTop: '0.5rem' }}>{subtitle}</p>}
        </div>
        <div style={{ padding: '0 1.5rem 4rem', width: '100%' }}>
          {children}
        </div>
        <style>{`
          @keyframes fadeInRight { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          input:focus { border-color: #3b82f6 !important; background: rgba(59, 130, 246, 0.05) !important; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1) !important; }
        `}</style>
      </div>
    );
  }

  return (
    <div style={STYLES.page}>
      <style>{`
        @keyframes fadeInLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
        input:focus { border-color: #3b82f6 !important; background: rgba(59, 130, 246, 0.05) !important; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1) !important; }
      `}</style>

      <div style={STYLES.leftSide}>
        <div style={{ ...STYLES.glow, top: '-10%', left: '-10%' }} />
        
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '4rem' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: -4, background: '#3b82f6', borderRadius: '18px', filter: 'blur(12px)', opacity: 0.5 }} />
              <img src="/nexus_icon.png" alt="Nexus" style={{ width: '64px', height: '64px', borderRadius: '16px', position: 'relative' }} />
            </div>
            <span style={{ fontSize: '2rem', fontWeight: '950', color: 'white', letterSpacing: '0.15em' }}>NEXUS HUB</span>
          </div>

          <h2 style={{ fontSize: '4.5rem', fontWeight: '950', color: 'white', lineHeight: 1.05, marginBottom: '2.5rem', letterSpacing: '-0.05em' }}>
            {title || (isCz ? 'Absolutní kontrola nad vaší agenturou.' : 'Absolute control over your agency.')}
          </h2>

          <div style={{ marginTop: '5rem' }}>
            <FeatureItem 
              icon={Shield} 
              title={isCz ? 'Safety Guard™' : 'Safety Guard™'} 
              desc={isCz ? 'Real-time monitoring, SOS alerty a komplexní zabezpečení vašich dat.' : 'Real-time monitoring, SOS alerts and comprehensive security for your data.'} 
              delay={0.1}
            />
            <FeatureItem 
              icon={BarChart3} 
              title={isCz ? 'Deep Analytics' : 'Deep Analytics'} 
              desc={isCz ? 'Detailní přehledy tržeb, predikce výkonu a pokročilé reportování.' : 'Detailed revenue insights, performance predictions and advanced reporting.'} 
              delay={0.2}
            />
            <FeatureItem 
              icon={Globe} 
              title={isCz ? 'Omnichannel Sync' : 'Omnichannel Sync'} 
              desc={isCz ? 'WhatsApp, Telegram, OF a další platformy synchronizované v jednom rozhraní.' : 'WhatsApp, Telegram, OF and other platforms synced in one unified interface.'} 
              delay={0.3}
            />
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: '4rem', left: '4rem', color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem', fontWeight: '600' }}>
          © {new Date().getFullYear()} Nexus Systems • Enterprise Grade Infrastructure
        </div>
      </div>

      <div style={STYLES.rightSide}>
        <div style={{ ...STYLES.glow, bottom: '-10%', right: '-10%', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1), transparent 70%)' }} />
        <div style={STYLES.formContainer}>
          {children}
          
          <div style={{ textAlign: 'center' }}>
            <button 
              onClick={() => setShowLanding(true)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '10px', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'white'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
            >
              <ChevronLeft size={18} /> {isCz ? 'Zpět na hlavní stránku' : 'Back to homepage'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(AuthLayout);
