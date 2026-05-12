import React from 'react';
import { 
  Rocket, Smartphone, Users,
  ArrowRight, Zap, ChevronRight
} from 'lucide-react';
import { useNexus } from '../../context/ContextHook';

const StepCard = ({ num, title, desc, icon: Icon, delay = 0, onClick }) => (
  <div 
    onClick={onClick}
    style={{ 
      display: 'flex', 
      flexDirection: 'column',
      gap: '1.5rem', 
      padding: '2.5rem',
      borderRadius: '32px',
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      cursor: onClick ? 'pointer' : 'default',
      position: 'relative',
      overflow: 'hidden',
      animation: `fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s both`
    }}
    onMouseEnter={(e) => {
      if (onClick) {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
      }
    }}
    onMouseLeave={(e) => {
      if (onClick) {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
      }
    }}
  >
    <div style={{ 
      position: 'absolute', top: '-20px', right: '-20px', 
      fontSize: '8rem', fontWeight: '950', color: 'rgba(255,255,255,0.02)',
      pointerEvents: 'none', userSelect: 'none'
    }}>
      {num}
    </div>

    <div style={{ 
      width: '56px', height: '56px', borderRadius: '18px', 
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%)', 
      color: '#60a5fa', 
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 10px 20px -5px rgba(59, 130, 246, 0.2)'
    }}>
      <Icon size={28} />
    </div>

    <div>
      <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1.4rem', fontWeight: '900', letterSpacing: '-0.01em' }}>{title}</h4>
      <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '1rem', lineHeight: 1.6 }}>{desc}</p>
    </div>

    {onClick && (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3b82f6', fontSize: '0.9rem', fontWeight: '800', marginTop: 'auto' }}>
        <span>{num === '1' ? 'Přejít k registraci' : 'Vstoupit'}</span>
        <ChevronRight size={16} />
      </div>
    )}
  </div>
);

const ManualView = () => {
  const { lang, navigate, setShowLanding } = useNexus();
  const isCz = lang === 'cz';

  const handleNavigate = (path, tab = 'login') => {
    navigate(path, tab);
    setShowLanding(false);
  };

  const t = {
    cz: {
      badge: 'RYCHLÝ START',
      title: 'Jak začít s Nexus Hub',
      desc: 'Průvodce registrací a prvním nastavením vaší agentury. Celý proces nezabere více než 5 minut.',
      steps: [
        { title: 'Založení Agentury', desc: 'Na přihlašovací obrazovce zvolte "Nová agentura". Po registraci získáte unikátní Zvací kód v Dashboardu. Tento kód je klíčem pro váš tým.', icon: Rocket },
        { title: 'Pozvání týmu', desc: 'Vaše operátorky a modelky si vytvoří účet přes záložku "Připojit se" použitím vašeho kódu. Vy je pak v sekci "Hierarchie" schválíte.', icon: Users },
        { title: 'Propojení telefonu', desc: 'Pro příjem SMS a hovorů nainstalujte Nexus Relay APK na Android zařízení. V sekci "Relay" pak uvidíte stav připojení.', icon: Smartphone }
      ],
      cta: 'Založit agenturu nyní',
      footer: 'Potřebujete pomoci s něčím jiným?',
      support: 'Kontaktujte podporu'
    },
    en: {
      badge: 'QUICK START',
      title: 'Getting Started',
      desc: 'A guide to registering and setting up your agency. The whole process takes less than 5 minutes.',
      steps: [
        { title: 'Create Agency', desc: 'Choose "New Agency" on the login screen. After registering, you\'ll find your unique Invite Code in the Dashboard.', icon: Rocket },
        { title: 'Invite Your Team', desc: 'Your operators and models create accounts via the "Join" tab using your code. You then approve them in the "Hierarchy" section.', icon: Users },
        { title: 'Connect Devices', desc: 'To receive SMS and calls, install the Nexus Relay APK on an Android device. Monitor connection status in the "Relay" section.', icon: Smartphone }
      ],
      cta: 'Register Agency Now',
      footer: 'Need help with something else?',
      support: 'Contact Support'
    }
  }[isCz ? 'cz' : 'en'];

  return (
    <div style={{ padding: '6rem 2rem 10rem', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
      
      {/* HEADER */}
      <header style={{ marginBottom: '6rem', textAlign: 'center' }}>
        <div style={{ 
          display: 'inline-flex', alignItems: 'center', gap: '0.75rem', 
          padding: '0.6rem 1.5rem', background: 'rgba(59, 130, 246, 0.08)',
          borderRadius: '30px', color: '#60a5fa', marginBottom: '2rem',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          fontSize: '0.75rem', fontWeight: '900', letterSpacing: '0.15em'
        }}>
          <Zap size={16} fill="currentColor" />
          {t.badge}
        </div>
        <h1 style={{ 
          margin: '0 0 1.5rem 0', fontSize: '4.5rem', fontWeight: '950', 
          letterSpacing: '-0.04em', lineHeight: 1,
          background: 'linear-gradient(to bottom, #fff 40%, #64748b)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>
          {t.title}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.25rem', lineHeight: 1.6, maxWidth: '700px', margin: '0 auto', fontWeight: '500' }}>
          {t.desc}
        </p>
      </header>

      {/* STEPS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '6rem' }}>
        {t.steps.map((step, idx) => (
          <StepCard 
            key={idx} 
            num={(idx + 1).toString()} 
            title={step.title} 
            desc={step.desc} 
            icon={step.icon}
            delay={idx * 0.1}
            onClick={idx === 0 ? () => handleNavigate('/register', 'register-agency') : (idx === 1 ? () => handleNavigate('/register', 'join-agency') : null)}
          />
        ))}

      {/* FINAL CTA */}
      <div style={{ textAlign: 'center', animation: 'fadeInUp 1s ease-out 0.4s both' }}>
        <button 
          onClick={() => handleNavigate('/register')}
          style={{ 
            padding: '1.5rem 4rem', borderRadius: '24px', border: 'none',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', 
            color: 'white', fontWeight: '900',
            fontSize: '1.2rem', cursor: 'pointer', display: 'inline-flex', 
            alignItems: 'center', gap: '1rem', 
            boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.5)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 35px 60px -15px rgba(59, 130, 246, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(59, 130, 246, 0.5)';
          }}
        >
          {t.cta} <ArrowRight size={22} />
        </button>

        <p style={{ marginTop: '4rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.95rem', fontWeight: '600' }}>
          {t.footer} <span style={{ color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '4px' }}>{t.support}</span>
        </p>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ManualView;
