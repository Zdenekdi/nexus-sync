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
  BookOpen,
  Check
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
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
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
      transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
      transition: `opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`
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
        background: open ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255,255,255,0.02)', 
        border: `1px solid ${open ? 'rgba(59, 130, 246, 0.3)' : 'var(--card-border)'}`,
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: '700', margin: 0, color: open ? 'white' : 'rgba(255,255,255,0.8)' }}>{question}</h4>
        {open ? <ChevronUp size={18} color="#3b82f6" /> : <ChevronDown size={18} color="#64748b" />}
      </div>
      <div style={{
        maxHeight: open ? '200px' : '0',
        overflow: 'hidden',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: open ? 1 : 0
      }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, marginTop: '0.75rem', marginBottom: 0 }}>
          {answer}
        </p>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const s = status?.toUpperCase();
  let bg = 'rgba(255, 255, 255, 0.05)';
  let color = 'rgba(255, 255, 255, 0.7)';
  let border = 'rgba(255, 255, 255, 0.2)';

  if (s === 'DONE' || s === 'HOTOVO' || s === 'ACTIVE' || s === 'AKTIVNÍ') {
    bg = 'rgba(16, 185, 129, 0.15)'; color = '#10b981'; border = 'rgba(16, 185, 129, 0.3)';
  } else if (s === 'BETA') {
    bg = 'rgba(139, 92, 246, 0.15)'; color = '#a78bfa'; border = 'rgba(139, 92, 246, 0.3)';
  } else if (s === 'PROGRESS' || s === 'VE VÝVOJI' || s === 'IN PROGRESS') {
    bg = 'rgba(245, 158, 11, 0.15)'; color = '#f59e0b'; border = 'rgba(245, 158, 11, 0.3)';
  }

  return (
    <span style={{
      fontSize: '0.65rem', fontWeight: '900', padding: '3px 10px', borderRadius: '8px',
      marginLeft: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em',
      background: bg, color: color, border: `1px solid ${border}`,
      display: 'inline-flex', alignItems: 'center', gap: '4px', backdropFilter: 'blur(4px)'
    }}>
      <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: color, display: 'inline-block' }} />
      {status}
    </span>
  );
};

const VideoCard = ({ src, title, desc, features, reverse, poster }) => {
  const [ref, isVisible] = useScrollReveal();
  const isTablet = window.innerWidth <= 968;
  
  return (
    <div ref={ref} style={{
      display: 'grid',
      gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr',
      gap: isTablet ? '2rem' : '6rem',
      alignItems: 'center',
      padding: isTablet ? '3rem 0' : '8rem 0',
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
      transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1)',
      direction: reverse && !isTablet ? 'rtl' : 'ltr'
    }}>
      <div style={{ direction: 'ltr', textAlign: 'left' }}>
        <h2 style={{ 
          fontSize: isTablet ? '2rem' : '2.75rem', fontWeight: '900', marginBottom: '1.5rem',
          background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>{title}</h2>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.7 }}>{desc}</p>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', borderRadius: '24px', padding: '1.5rem', backdropFilter: 'blur(10px)' }}>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {features.map((f, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.95rem', fontWeight: '600', color: 'rgba(255,255,255,0.8)' }}>
                <div style={{ width: '8px', height: '8px', background: 'var(--accent-color)', borderRadius: '50%', boxShadow: '0 0 10px var(--accent-glow)' }} />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div style={{ direction: 'ltr' }}>
        <div style={{ position: 'relative', padding: '10px', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '32px', boxShadow: '0 40px 80px -20px rgba(0, 0, 0, 0.8)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
          <video poster={poster} controls playsInline preload="metadata" style={{ width: '100%', borderRadius: '24px', display: 'block', objectFit: 'cover' }}>
            <source src={src} type="video/mp4" />
          </video>
        </div>
      </div>
    </div>
  );
};

const LandingPage = () => {
  const { setActiveTab, lang, setLang, isMobile, activeTab, navigate } = useNexus();
  const viewingManual = activeTab === 'guide';

  useEffect(() => { window.scrollTo(0, 0); }, [viewingManual]);

  const t = {
    cz: {
      hero: {
        badge: "BUDOUCNOST SPRÁVY AGENTUR",
        title: "Absolutní kontrola.\nNekonečný růst.",
        desc: "Nexus Hub je inteligentní ekosystém pro moderní adult agentury. Kombinujeme pokročilou AI, real-time bezpečnost a analytiku, kterou jinde nenajdete.",
        cta1: "Vstoupit do aplikace",
        cta2: "Jak to funguje?"
      },
      stats: [
        { label: "Aktivních agentur", val: "50+" },
        { label: "Zpráv / měsíc", val: "2.4M+" },
        { label: "Bezpečnostní skóre", val: "99.9%" }
      ],
      integrations: ["WhatsApp", "Telegram", "OnlyFans", "Stripe", "VOIP", "Crypto"],
      features: [
        { icon: Shield, title: "Safety Guard™", desc: "Real-time SOS a monitoring výjezdů." },
        { icon: Zap, title: "AI Smart Replies", desc: "Automatizované odpovědi a překlady." },
        { icon: Globe, title: "Global Sync", desc: "Synchronizace napříč všemi zařízeními." },
        { icon: BarChart3, title: "Deep Analytics", desc: "Tržby a konverze pod mikroskopem." }
      ],
      pricingTitle: "Tarify a předplatné",
      plans: [
        { id: 'basic', name: 'Basic', price: '2 900 Kč', desc: 'Ideální pro začínající týmy.', features: ['Správa 5 profilů', 'Základní analytika', 'Safety Guard standard'] },
        { id: 'pro', name: 'Pro', price: '5 900 Kč', desc: 'Pro rostoucí profesionály.', features: ['Správa 10 profilů', 'AI Optimalizace', 'Pokročilé reporty'], popular: true },
        { id: 'agency', name: 'Agency', price: '9 900 Kč', desc: 'Neomezený výkon pro lídry.', features: ['Správa 20+ profilů', 'API Přístup', 'Prioritní podpora'] }
      ],
      faqTitle: "Často kladené otázky",
      faqs: [
        { q: "Je systém skutečně anonymní?", a: "Ano, Nexus Hub je navržen s důrazem na soukromí. Neukládáme žádné citlivé údaje, které by mohly spojit operátory s konkrétními osobami." },
        { q: "Jak funguje Safety Guard SOS?", a: "V případě nebezpečí stačí vyslovit hlasový kód nebo stisknout SOS tlačítko. Systém okamžitě rozešle alerty všem managerům s polohou a zvukem." },
        { q: "Mohu přejít na jiný tarif později?", a: "Samozřejmě. Upgrade i downgrade je možný kdykoliv z administračního panelu." }
      ],
      videos: [
        { id: 'safety', src: '/safety.mp4', title: 'Bezpečnost na prvním místě', desc: 'Safety Guard™ s taktickým přehledem v reálném čase. Automatické SOS alerty a sledování polohy.', features: ['Sledování polohy', 'Hlasové SOS', 'Globální blacklist'] },
        { id: 'analytics', src: '/analytics.mp4', title: 'Business pod kontrolou', desc: 'Zapomeňte na tabulky. Okamžitý přehled o tržbách, konverzích a výkonu celého týmu.', features: ['Real-time tržby', 'Výpočet provizí', 'VIP Management'], reverse: true }
      ]
    },
    en: {
      hero: {
        badge: "FUTURE OF AGENCY MANAGEMENT",
        title: "Absolute Control.\nInfinite Growth.",
        desc: "Nexus Hub is an intelligent ecosystem for modern adult agencies. We combine advanced AI, real-time safety, and analytics you won't find anywhere else.",
        cta1: "Enter Application",
        cta2: "How it works?"
      },
      stats: [
        { label: "Active Agencies", val: "50+" },
        { label: "Messages / Month", val: "2.4M+" },
        { label: "Security Score", val: "99.9%" }
      ],
      integrations: ["WhatsApp", "Telegram", "OnlyFans", "Stripe", "VOIP", "Crypto"],
      features: [
        { icon: Shield, title: "Safety Guard™", desc: "Real-time SOS and outcall monitoring." },
        { icon: Zap, title: "AI Smart Replies", desc: "Automated responses and translations." },
        { icon: Globe, title: "Global Sync", desc: "Synchronization across all devices." },
        { icon: BarChart3, title: "Deep Analytics", desc: "Revenue and conversion insights." }
      ],
      pricingTitle: "Pricing & Subscriptions",
      plans: [
        { id: 'basic', name: 'Basic', price: '€120', desc: 'Perfect for starting teams.', features: ['5 Profiles', 'Basic Analytics', 'Safety Guard Standard'] },
        { id: 'pro', name: 'Pro', price: '€240', desc: 'For growing professionals.', features: ['10 Profiles', 'AI Optimization', 'Advanced Reports'], popular: true },
        { id: 'agency', name: 'Agency', price: '€400', desc: 'Unlimited power for leaders.', features: ['20+ Profiles', 'API Access', 'Priority Support'] }
      ],
      faqTitle: "Frequently Asked Questions",
      faqs: [
        { q: "Is the system truly anonymous?", a: "Yes, Nexus Hub is built with privacy first. We do not store sensitive links between operators and identities." },
        { q: "How does Safety Guard SOS work?", a: "In case of danger, say the voice code or press SOS. The system alerts managers with location and live audio." }
      ],
      videos: [
        { id: 'safety', src: '/safety.mp4', title: 'Safety First', desc: 'Safety Guard™ with real-time tactical overview. Automated SOS alerts and location tracking.', features: ['Location Tracking', 'Voice SOS', 'Global Blacklist'] },
        { id: 'analytics', src: '/analytics.mp4', title: 'Business Control', desc: 'Forget spreadsheets. Instant overview of revenue, conversions, and team performance.', features: ['Real-time Revenue', 'Commission Tracking', 'VIP Management'], reverse: true }
      ]
    }
  }[lang];

  if (viewingManual) {
    return (
      <div style={{ background: '#040507', minHeight: '100vh', color: 'white', fontFamily: 'Inter, sans-serif' }}>
        <nav style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'rgba(4,5,7,0.8)', backdropFilter: 'blur(10px)', zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <button onClick={() => setActiveTab('dashboard')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowLeft size={18} /> {lang === 'cz' ? 'Zpět' : 'Back'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src="/nexus_icon.png" alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
              <span style={{ fontWeight: '900', letterSpacing: '0.05em' }}>NEXUS HUB</span>
            </div>
          </div>
          <button onClick={() => { navigate('/login'); }} style={{ background: 'var(--accent-color)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
            {lang === 'cz' ? 'Vstoupit do aplikace' : 'Enter App'}
          </button>
        </nav>
        <ManualView />
      </div>
    );
  }

  return (
    <div data-testid="landing-page-container" style={{ minHeight: '100vh', background: '#040507', color: 'white', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>
      
      {/* BACKGROUND EFFECTS */}
      <div style={{ position: 'fixed', top: '0', left: '50%', transform: 'translateX(-50%)', width: '100%', height: '100%', background: 'radial-gradient(circle at 50% -20%, rgba(59, 130, 246, 0.15), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-20%', left: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08), transparent 70%)', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0 }} />

      {/* NAVBAR-LIKE HEADER */}
      <div style={{ position: 'fixed', top: 0, width: '100%', zIndex: 1000, padding: '1.5rem 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backdropFilter: 'blur(10px)', background: 'rgba(4,5,7,0.4)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/nexus_icon.png" alt="Nexus" style={{ width: '32px', height: '32px', borderRadius: '8px', boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)' }} />
          <span style={{ fontWeight: '900', letterSpacing: '0.1em', fontSize: '1.1rem' }}>NEXUS HUB</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
            {['cz', 'en'].map(l => (
              <button key={l} onClick={() => setLang(l)} style={{ padding: '4px 10px', borderRadius: '8px', border: 'none', background: lang === l ? 'rgba(59, 130, 246, 0.2)' : 'transparent', color: lang === l ? '#3b82f6' : 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s' }}>{l.toUpperCase()}</button>
            ))}
          </div>
          {!isMobile && (
            <button onClick={() => navigate('/login')} style={{ background: 'white', color: 'black', border: 'none', padding: '10px 22px', borderRadius: '12px', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', transition: 'transform 0.2s' }}>
              {t.hero.cta1}
            </button>
          )}
        </div>
      </div>

      {/* HERO SECTION */}
      <section style={{ padding: isMobile ? '8rem 5% 4rem' : '14rem 5% 6rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <ScrollReveal>
          <div style={{ display: 'inline-block', padding: '0.6rem 1.4rem', borderRadius: '30px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontWeight: '900', fontSize: '0.7rem', letterSpacing: '0.15em', marginBottom: '2.5rem', textShadow: '0 0 10px rgba(59, 130, 246, 0.3)' }}>
            {t.hero.badge}
          </div>
          <h1 style={{ fontSize: isMobile ? '2.8rem' : '5.5rem', fontWeight: '900', lineHeight: 1, marginBottom: '2.5rem', letterSpacing: '-0.04em', background: 'linear-gradient(to bottom, #fff 40%, #64748b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'pre-line' }}>
            {t.hero.title}
          </h1>
          <p style={{ fontSize: isMobile ? '1.1rem' : '1.4rem', color: 'rgba(255,255,255,0.5)', maxWidth: '750px', margin: '0 auto 4rem', lineHeight: 1.6, fontWeight: '400' }}>
            {t.hero.desc}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1.5rem' }}>
            <button onClick={() => navigate('/login')} style={{ padding: '1.25rem 3.5rem', borderRadius: '20px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: '900', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 20px 40px -10px rgba(59, 130, 246, 0.5)', transition: 'all 0.3s ease' }}>
              {t.hero.cta1}
            </button>
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} style={{ padding: '1.25rem 3rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'white', fontWeight: '800', fontSize: '1.1rem', cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all 0.3s ease' }}>
              {t.hero.cta2}
            </button>
          </div>
        </ScrollReveal>

        {/* HERO PREVIEW CARD */}
        {!isMobile && (
          <ScrollReveal delay={0.3}>
            <div style={{ marginTop: '6rem', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', height: '80%', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2), transparent 70%)', filter: 'blur(50px)', zIndex: -1 }} />
              <div style={{ maxWidth: '1000px', margin: '0 auto', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(40px)', padding: '10px', boxShadow: '0 50px 100px -20px rgba(0,0,0,0.7)' }}>
                <div style={{ width: '100%', borderRadius: '24px', aspectRatio: '16/9', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                   <div style={{ position: 'absolute', top: '10%', left: '10%', width: '80%', height: '80%', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px', background: 'rgba(0,0,0,0.2)' }} />
                   <div style={{ fontSize: '1rem', fontWeight: '900', color: 'rgba(59, 130, 246, 0.5)', letterSpacing: '0.2em' }}>DASHBOARD PREVIEW</div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        )}
      </section>

      {/* INTEGRATIONS BAR */}
      <section style={{ padding: '4rem 5%', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: isMobile ? '2rem' : '4rem', opacity: 0.5 }}>
          {/* WhatsApp */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={20} color="white" />
            <span style={{ fontSize: '0.8rem', fontWeight: '900', letterSpacing: '0.1em' }}>WHATSAPP</span>
          </div>
          {/* Telegram */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Send size={20} color="white" />
            <span style={{ fontSize: '0.8rem', fontWeight: '900', letterSpacing: '0.1em' }}>TELEGRAM</span>
          </div>
          {/* OnlyFans */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Star size={20} color="white" />
            <span style={{ fontSize: '0.8rem', fontWeight: '900', letterSpacing: '0.1em' }}>ONLYFANS</span>
          </div>
          {/* Stripe */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={20} color="white" />
            <span style={{ fontSize: '0.8rem', fontWeight: '900', letterSpacing: '0.1em' }}>STRIPE</span>
          </div>
          {/* VOIP */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Phone size={20} color="white" />
            <span style={{ fontSize: '0.8rem', fontWeight: '900', letterSpacing: '0.1em' }}>VOIP</span>
          </div>
          {/* Crypto */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={20} color="white" />
            <span style={{ fontSize: '0.8rem', fontWeight: '900', letterSpacing: '0.1em' }}>CRYPTO</span>
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section style={{ padding: '6rem 5%' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '2rem' }}>
          {t.stats.map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3.5rem', fontWeight: '900', color: 'white', marginBottom: '0.5rem', background: 'linear-gradient(to bottom, #fff, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.val}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES GRID */}
      <section id="features" style={{ padding: '6rem 5%' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '1.5rem' }}>
            {t.features.map((f, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <div style={{ padding: '2rem', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.3s ease' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: '#3b82f6' }}>
                    <f.icon size={24} />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1rem' }}>{f.title}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* VIDEO CASE STUDIES */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
        {t.videos.map(v => <VideoCard key={v.id} {...v} />)}
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" style={{ padding: '8rem 5% 6rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: isMobile ? '2.5rem' : '3.5rem', fontWeight: '900', textAlign: 'center', marginBottom: '4rem', letterSpacing: '-0.02em' }}>{t.pricingTitle}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '2rem', alignItems: 'flex-end' }}>
            {t.plans.map((p, i) => (
              <ScrollReveal key={p.id} delay={i * 0.1}>
                <div style={{ padding: '2.5rem', borderRadius: '32px', background: p.popular ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${p.popular ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`, position: 'relative', overflow: 'hidden' }}>
                  {p.popular && <div style={{ position: 'absolute', top: '1.5rem', right: '-2rem', background: '#3b82f6', color: 'white', padding: '0.3rem 3rem', fontSize: '0.65rem', fontWeight: '900', transform: 'rotate(45deg)', letterSpacing: '0.1em' }}>POPULAR</div>}
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem', opacity: 0.6 }}>{p.name}</h3>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '1rem' }}>{p.price} <span style={{ fontSize: '0.9rem', opacity: 0.3, fontWeight: '500' }}>/ mo</span></div>
                  <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2rem' }}>{p.desc}</p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {p.features.map((feat, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', fontWeight: '600' }}>
                        <Check size={16} color="#10b981" /> {feat}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => navigate('/login')} style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: 'none', background: p.popular ? '#3b82f6' : 'rgba(255,255,255,0.05)', color: 'white', fontWeight: '800', cursor: 'pointer', transition: 'all 0.3s' }}>{t.hero.cta1}</button>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section style={{ padding: '6rem 5%', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '900', textAlign: 'center', marginBottom: '3rem' }}>{t.faqTitle}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {t.faqs.map((f, i) => <FAQItem key={i} question={f.q} answer={f.a} />)}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '6rem 5% 4rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <img src="/nexus_icon.png" alt="Nexus" style={{ width: '28px', height: '28px', borderRadius: '8px' }} />
          <span style={{ fontWeight: '900', letterSpacing: '0.1em' }}>NEXUS HUB</span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>© {new Date().getFullYear()} Nexus Systems. Absolute Control. Infinite Growth.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
