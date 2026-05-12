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
  Check,
  Send,
  CreditCard,
  Phone,
  Database
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
                   {/* Realistic UI Elements Mockup */}
                   <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.1, background: 'url("data:image/svg+xml,%3Csvg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%239C92AC" fill-opacity="0.4" fill-rule="evenodd"%3E%3Ccircle cx="3" cy="3" r="3"/%3E%3Ccircle cx="13" cy="13" r="3"/%3E%3C/g%3E%3C/svg%3E")' }} />
                   <div style={{ width: '85%', height: '70%', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                     <div style={{ display: 'flex', gap: '10px' }}>
                       <div style={{ width: '100px', height: '12px', background: 'rgba(59, 130, 246, 0.4)', borderRadius: '6px' }} />
                       <div style={{ width: '60px', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px' }} />
                     </div>
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                       {[1,2,3].map(i => <div key={i} style={{ height: '80px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }} />)}
                     </div>
                     <div style={{ height: '40px', width: '100%', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', border: '1px dashed rgba(34, 197, 94, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e', fontSize: '0.7rem', fontWeight: 'bold' }}>SMS RELAY ACTIVE: 2.4M MSGS</div>
                   </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        )}
      </section>

      {/* INTEGRATIONS BAR */}
      <section style={{ padding: '4rem 5%', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: isMobile ? '2rem' : '5rem', opacity: 0.6 }}>
          {/* WhatsApp */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', filter: 'drop-shadow(0 0 10px rgba(37, 211, 102, 0.2))' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.558 0 11.894-5.335 11.897-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            <span style={{ fontSize: '0.85rem', fontWeight: '900', color: 'white', letterSpacing: '0.1em' }}>WHATSAPP</span>
          </div>
          {/* Telegram */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', filter: 'drop-shadow(0 0 10px rgba(0, 136, 204, 0.2))' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#0088cc"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2s-.21-.05-.3-.03c-.12.03-1.92 1.22-5.43 3.58-.51.35-.97.52-1.38.51-.45-.01-1.32-.25-1.97-.46-.8-.26-1.43-.4-1.37-.84.03-.23.35-.46.96-.7 3.76-1.63 6.27-2.71 7.52-3.23 3.58-1.48 4.32-1.74 4.81-1.75.11 0 .35.03.5.15.13.11.17.26.19.37z"/></svg>
            <span style={{ fontSize: '0.85rem', fontWeight: '900', color: 'white', letterSpacing: '0.1em' }}>TELEGRAM</span>
          </div>
          {/* Stripe */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', filter: 'drop-shadow(0 0 10px rgba(103, 114, 229, 0.2))' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#6772e5"><path d="M13.962 8.885c-1.57-.403-2.22-.72-2.22-1.344 0-.54.512-.906 1.344-.906 1.62 0 2.394.885 2.454 1.155.06.326.357.545.673.545h.024c.42 0 .736-.375.666-.788-.236-1.393-1.554-2.296-3.144-2.296-1.5 0-2.88.75-2.88 2.35 0 1.545 1.14 2.23 2.805 2.656 1.635.405 2.145.78 2.145 1.44 0 .61-.63 1.05-1.5 1.05-1.89 0-2.82-1.12-2.92-1.44-.085-.296-.34-.492-.638-.492h-.032c-.44 0-.756.402-.647.828.32 1.253 1.683 2.502 4.237 2.502 1.59 0 3.03-.81 3.03-2.52 0-1.74-1.556-2.316-3.414-2.79zM6.5 10V8c0-.55-.45-1-1-1s-1 .45-1 1v7c0 .55.45 1 1 1s1-.45 1-1v-2h2c.55 0 1-.45 1-1s-.45-1-1-1h-2z"/></svg>
            <span style={{ fontSize: '0.85rem', fontWeight: '900', color: 'white', letterSpacing: '0.1em' }}>STRIPE</span>
          </div>
          {/* OnlyFans */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', filter: 'drop-shadow(0 0 10px rgba(0, 175, 240, 0.2))' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#00aff0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c4.42 0 8 3.58 8 8s-3.58 8-8 8-8-3.58-8-8 3.58-8 8-8zm-1 4h2v2h-2V8zm0 4h2v6h-2v-6z"/></svg>
            <span style={{ fontSize: '0.85rem', fontWeight: '900', color: 'white', letterSpacing: '0.1em' }}>ONLYFANS</span>
          </div>
          {/* SMS Relay */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.2))' }}>
            <MessageSquare size={24} color="#3b82f6" />
            <span style={{ fontSize: '0.85rem', fontWeight: '900', color: 'white', letterSpacing: '0.1em' }}>SMS RELAY</span>
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
