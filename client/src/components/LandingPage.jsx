import React, { useEffect, useRef, useState } from 'react';
import { 
  Shield, 
  Zap, 
  Globe, 
  Lock, 
  BarChart3, 
  Users, 
  MessageSquare, 
  ArrowRight,
  ChevronDown,
  Calendar,
  Smartphone,
  Package as PackageIcon,
  Settings,
  Bell,
  MapPin,
  Star,
  HelpCircle,
  ChevronUp,
  ArrowLeft,
  BookOpen
} from 'lucide-react';

import { useNexus } from '../context/ContextHook';
import ManualView from './Views/ManualView';

// Scroll-reveal hook
const useScrollReveal = () => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.unobserve(el); } },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, isVisible];
};

const ScrollReveal = ({ children, delay = 0, style = {} }) => {
  const [ref, isVisible] = useScrollReveal();
  return (
    <div ref={ref} style={{
      ...style,
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
      transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`
    }}>
      {children}
    </div>
  );
};

const FAQItem = ({ question, answer }) => {
  const [open, setOpen] = useState(false);
  return (
    <div 
      onClick={() => setOpen(!open)}
      style={{ 
        padding: '1.25rem 1.5rem', borderRadius: '16px', cursor: 'pointer',
        background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)',
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: '700', margin: 0 }}>{question}</h4>
        {open ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
      </div>
      <div style={{
        maxHeight: open ? '200px' : '0',
        overflow: 'hidden',
        transition: 'max-height 0.3s ease, opacity 0.3s ease',
        opacity: open ? 1 : 0
      }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, marginTop: '0.75rem', marginBottom: 0 }}>
          {answer}
        </p>
      </div>
    </div>
  );
};

const StatusBadge = ({ type, lang }) => {
  let bg = 'rgba(59, 130, 246, 0.15)'; // Default Blue
  let color = 'var(--accent-color)';
  let border = 'rgba(59, 130, 246, 0.3)';
  let label = type.toUpperCase();

  const isCz = lang === 'cz';

  if (type === 'coming') {
    label = isCz ? 'BRZY' : 'SOON';
  } else if (type === 'beta') {
    bg = 'rgba(139, 92, 246, 0.15)';
    color = '#a78bfa';
    border = 'rgba(139, 92, 246, 0.3)';
    label = 'BETA';
  } else if (type === 'aktivní' || type === 'active') {
    bg = 'rgba(16, 185, 129, 0.15)';
    color = '#10b981';
    border = 'rgba(16, 185, 129, 0.3)';
    label = isCz ? 'AKTIVNÍ' : 'ACTIVE';
  } else if (type === 've vývoji' || type === 'progress') {
    bg = 'rgba(245, 158, 11, 0.15)';
    color = '#f59e0b';
    border = 'rgba(245, 158, 11, 0.3)';
    label = isCz ? 'VE VÝVOJI' : 'IN PROGRESS';
  }

  return (
    <span style={{
      fontSize: '0.65rem',
      fontWeight: '800',
      padding: '3px 10px',
      borderRadius: '8px',
      marginLeft: '0.6rem',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      background: bg,
      color: color,
      border: `1px solid ${border}`,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      boxShadow: `0 0 15px ${bg}`,
      backdropFilter: 'blur(4px)',
      verticalAlign: 'middle'
    }}>
      <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: color, display: 'inline-block' }} />
      {label}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const getColors = () => {
    switch (status) {
      case 'DONE':
      case 'HOTOVO': return { bg: 'rgba(34, 197, 94, 0.1)', border: '#22c55e', text: '#4ade80' };
      case 'BETA': return { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', text: '#60a5fa' };
      default: return { bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255,255,255,0.2)', text: 'rgba(255,255,255,0.7)' };
    }
  };
  const colors = getColors();
  return (
    <span style={{ 
      padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '900', 
      background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text,
      marginLeft: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em'
    }}>
      {status}
    </span>
  );
};

const LanguageSwitcher = ({ current, onSelect, isMobile }) => {
  return (
    <div style={{
      position: 'fixed',
      top: isMobile ? '1rem' : '2rem',
      right: isMobile ? '1rem' : '5%',
      zIndex: 1000,
      display: 'flex',
      gap: '2px',
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      padding: '4px',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
    }}>
      {['cz', 'en'].map((l) => (
        <button
          key={l}
          onClick={() => onSelect(l)}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: 'none',
            background: current === l ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            color: current === l ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.5)',
            fontSize: '0.75rem',
            fontWeight: '800',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '40px',
            boxShadow: current === l ? '0 0 15px rgba(59, 130, 246, 0.3)' : 'none'
          }}
        >
          {l}
        </button>
      ))}
    </div>
  );
};
const VideoCard = ({ src, title, desc, features, reverse, lang }) => {
  const [ref, isVisible] = useScrollReveal();
  
  return (
    <div ref={ref} style={{
      display: 'grid',
      gridTemplateColumns: window.innerWidth <= 968 ? '1fr' : '1fr 1fr',
      gap: '4rem',
      alignItems: 'center',
      padding: '6rem 0',
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
      transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1)',
      direction: reverse ? 'rtl' : 'ltr'
    }}>
      <div style={{ direction: 'ltr', textAlign: 'left' }}>
        <h2 style={{ 
          fontSize: '2.5rem', 
          fontWeight: '900', 
          marginBottom: '1.5rem',
          background: 'linear-gradient(135deg, var(--accent-color) 0%, #1d4ed8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>{title}</h2>
        <p style={{ 
          fontSize: '1.15rem', 
          color: 'var(--text-secondary)', 
          marginBottom: '2rem',
          lineHeight: 1.6
        }}>{desc}</p>
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--card-border)',
          borderRadius: '20px',
          padding: '1.5rem',
          backdropFilter: 'blur(10px)'
        }}>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {features.map((f, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem', fontWeight: '600' }}>
                <div style={{ width: '6px', height: '6px', background: 'var(--accent-color)', borderRadius: '50%' }} />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div style={{ direction: 'ltr' }}>
        <div style={{
          position: 'relative',
          padding: '8px',
          background: '#1e293b',
          borderRadius: '24px',
          boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.6)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <video 
            controls playsInline preload="metadata"
            style={{ width: '100%', borderRadius: '16px', display: 'block', objectFit: 'cover' }}
          >
            <source src={src} type="video/mp4" />
          </video>
        </div>
      </div>
    </div>
  );
};

const LandingPage = () => {
  const { setActiveTab, setShowLanding, lang, setLang, isMobile, activeTab, navigate } = useNexus();

  const viewingManual = activeTab === 'guide';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [viewingManual]);

  if (viewingManual) {
    return (
      <div style={{ background: '#040507', minHeight: '100vh', color: 'white', fontFamily: 'Inter, sans-serif' }}>
        <nav style={{ 
          padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: 'rgba(4,5,7,0.8)', backdropFilter: 'blur(10px)', zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <button 
              onClick={() => setActiveTab('dashboard')}
              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <ArrowLeft size={18} /> {lang === 'cz' ? 'Zpět' : 'Back'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src="/nexus_icon.png" alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
              <span style={{ fontWeight: '900', letterSpacing: '0.05em' }}>NEXUS HUB</span>
            </div>
          </div>
          <button 
            onClick={() => { navigate('/login'); }}
            style={{ background: 'var(--accent-color)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
          >
            {lang === 'cz' ? 'Vstoupit do aplikace' : 'Enter App'}
          </button>
        </nav>
        <ManualView />
      </div>
    );
  }

  const content = {
    cz: {
      title: "Budoucnost správy adult agentur",
      tagline: "Absolutní kontrola. Nekonečný růst.",
      heroDesc: "Nexus Hub je inteligentní ekosystém navržený pro moderní agentury. Kombinujeme pokročilou AI, real-time synchronizaci a nekompromisní důraz na bezpečnost.",
      enterBtn: "Vstoupit do aplikace",
      videoSections: [
        {
          id: 'safety',
          src: '/safety.mp4',
          title: 'Bezpečnost na prvním místě',
          desc: 'Unikátní systém Safety Guard™ s taktickým přehledem v reálném čase. Automatické SOS alerty, sledování polohy při výjezdech a inteligentní blacklist.',
          features: ['Sledování polohy v reálném čase', 'Automatická SOS detekce', 'Globální blacklist klientů']
        },
        {
          id: 'analytics',
          src: '/analytics.mp4',
          title: 'Business pod kontrolou',
          desc: 'Zapomeňte na tabulky. Nexus Hub vám dává okamžitý přehled o tržbách, konverzích a výkonu jednotlivých modelek. Přesné výpočty provizí v reálném čase.',
          features: ['Detailní tržby a konverze', 'Pokročilé finanční přehledy', 'VIP Client Management (CRM)'],
          reverse: true
        },
        {
          id: 'operations',
          src: '/operations.mp4',
          title: 'Efektivní operativa',
          desc: 'Vše na jednom místě – od správy kalendáře a rezervací až po skladové zásoby. Náš integrovaný Inbox umožňuje týmu reagovat bleskově.',
          features: ['Inteligentní rezervační kalendář', 'Skladový systém (Inventory)', 'Centralizovaný Messenger']
        }
      ],
      roadmapTitle: "Stav vývoje & Roadmap",
      roadmap: [
        { name: "Jádro systému & Šifrování", status: "HOTOVO" },
        { name: "Safety Guard™ Real-time", status: "HOTOVO" },
        { name: "Skladový systém (Inventory)", status: "BETA" },
        { name: "Native iOS / Android App", status: "BETA" },
        { name: "AI Automatické odpovědi", status: "Q3 2025" },
        { name: "Krypto Výplaty & De-Fi", status: "Q4 2025" }
      ],
      registrationTitle: "Jak registrovat agenturu?",
      registrationSteps: [
        { title: "Kontaktujte nás", desc: "Napište nám na Telegram @nexus_sys pro získání přístupového klíče." },
        { title: "Vytvořte workspace", desc: "Zadejte údaje o vaší agentuře a nastavte základní parametry." },
        { title: "Pozvěte svůj tým", desc: "Přidejte operátory a modelky do systému pod vaší kontrolu." }
      ],
      footer: "Nexus Systems – Váš nástroj pro efektivní škálování."
    },
    en: {
      title: "The Future of Agency Management",
      tagline: "Absolute Control. Infinite Growth.",
      heroDesc: "Nexus Hub is an intelligent ecosystem designed for modern agencies. We combine advanced AI, real-time sync, and an uncompromising focus on security.",
      enterBtn: "Enter Application",
      videoSections: [
        {
          id: 'safety',
          src: '/safety.mp4',
          title: 'Safety First',
          desc: 'Unique Safety Guard™ system with real-time tactical overview. Automated SOS alerts, location tracking for outcalls, and intelligent blacklist.',
          features: ['Real-time location tracking', 'Automatic SOS detection', 'Global client blacklist']
        },
        {
          id: 'analytics',
          src: '/analytics.mp4',
          title: 'Business Under Control',
          desc: 'Forget about spreadsheets. Nexus Hub gives you an instant overview of revenue, conversions, and performance. Precise commission calculations in real-time.',
          features: ['Detailed revenue & conversions', 'Advanced financial insights', 'VIP Client Management (CRM)'],
          reverse: true
        },
        {
          id: 'operations',
          src: '/operations.mp4',
          title: 'Efficient Operations',
          desc: 'Everything in one place – from calendar management to inventory. Our integrated Inbox allows your team to respond lightning-fast.',
          features: ['Smart booking calendar', 'Inventory management', 'Centralized Messenger']
        }
      ],
      roadmapTitle: "Development Status & Roadmap",
      roadmap: [
        { name: "Core System & Encryption", status: "DONE" },
        { name: "Safety Guard™ Real-time", status: "DONE" },
        { name: "Inventory Management", status: "BETA" },
        { name: "Native iOS / Android App", status: "BETA" },
        { name: "AI Automated Replies", status: "Q3 2025" },
        { name: "Crypto Payouts & De-Fi", status: "Q4 2025" }
      ],
      registrationTitle: "How to register an agency?",
      registrationSteps: [
        { title: "Contact Us", desc: "Message us on Telegram @nexus_sys to obtain your access key." },
        { title: "Create Workspace", desc: "Enter your agency details and set initial parameters." },
        { title: "Invite Your Team", desc: "Add operators and models to the system under your control." }
      ],
      footer: "Nexus Systems – Your tool for efficient scaling."
    }
  };

  const t = content[lang] || content.en;

  return (
    <div className="landing-container fade-in" style={{ 
      minHeight: '100dvh',
      background: '#080a0f',
      color: 'white',
      fontFamily: 'inherit',
      overflowX: 'hidden',
      position: 'relative'
    }}>
      {/* Background Orbs */}
      <div style={{ position: 'fixed', top: '-10%', right: '-5%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }}></div>
      <div style={{ position: 'fixed', bottom: '-10%', left: '-5%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }}></div>

      <LanguageSwitcher current={lang} onSelect={setLang} isMobile={isMobile} />

      {/* Hero Section */}
      <section style={{ padding: isMobile ? '4rem 5% 2rem' : '10rem 5% 4rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'inline-block', padding: '0.5rem 1.5rem', borderRadius: '30px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: 'var(--accent-color)', fontWeight: '800', fontSize: '0.75rem', letterSpacing: '0.1em', marginBottom: '2rem' }}>
          {t.tagline.toUpperCase()}
        </div>
        <h1 style={{ fontSize: isMobile ? '2.5rem' : '5rem', fontWeight: '900', lineHeight: 1.1, marginBottom: '2rem', letterSpacing: '-0.02em', background: 'linear-gradient(to bottom, #fff 30%, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {t.title}
        </h1>
        <p style={{ fontSize: isMobile ? '1rem' : '1.3rem', color: 'var(--text-secondary)', maxWidth: '800px', margin: '0 auto 3.5rem', lineHeight: 1.6 }}>
          {t.heroDesc}
        </p>
        <button 
          onClick={() => navigate('/login')}
          style={{ 
            padding: '1.25rem 3.5rem', borderRadius: '18px', border: 'none', 
            background: 'var(--accent-color)', color: 'white', fontWeight: '900', 
            fontSize: '1.1rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', 
            gap: '0.75rem', boxShadow: '0 15px 40px rgba(59, 130, 246, 0.4)', transition: 'transform 0.2s'
          }}
        >
          {t.enterBtn} <ArrowRight size={22} />
        </button>
      </section>

      {/* Video Sections */}
      <section className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', position: 'relative', zIndex: 1 }}>
        {t.videoSections.map((s, i) => (
          <VideoCard key={s.id} {...s} lang={lang} />
        ))}
      </section>

      {/* Roadmap Section */}
      <section className="container" style={{ maxWidth: '1000px', margin: '4rem auto', padding: '4rem 2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '32px', border: '1px solid var(--card-border)' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '900', textAlign: 'center', marginBottom: '3rem' }}>{t.roadmapTitle}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
          {t.roadmap.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>{item.name}</span>
              <StatusBadge status={item.status} />
            </div>
          ))}
        </div>
      </section>

      {/* Registration Section */}
      <section className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '6rem 2rem' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: '900', textAlign: 'center', marginBottom: '4rem' }}>{t.registrationTitle}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '3rem' }}>
          {t.registrationSteps.map((step, idx) => (
            <div key={idx} style={{ textAlign: 'center' }}>
              <div style={{ width: '50px', height: '50px', background: 'var(--accent-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.25rem', fontWeight: '900', boxShadow: '0 0 20px var(--accent-glow)' }}>
                {idx + 1}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1rem' }}>{step.title}</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '6rem 5% 4rem', textAlign: 'center', borderTop: '1px solid var(--card-border)', color: 'var(--text-secondary)', fontSize: '0.9rem', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <img src="/nexus_icon.png" alt="Nexus" style={{ width: '28px', height: '28px', borderRadius: '8px' }} />
          <span style={{ fontWeight: '900', letterSpacing: '0.1em', color: 'white' }}>NEXUS HUB</span>
        </div>
        <p>{t.footer}</p>
        <p style={{ marginTop: '2rem', opacity: 0.5 }}>© {new Date().getFullYear()} Nexus Systems. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
