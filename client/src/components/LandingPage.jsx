import React from 'react';
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
  Package,
  Settings,
  Bell,
  MapPin,
  Star
} from 'lucide-react';

import { useNexus } from '../context/NexusContext';

const LandingPage = () => {
  const { setShowLanding, lang, setLang, isMobile } = useNexus();

  const onLoginClick = () => setShowLanding(false);

  const content = {
    cz: {
      title: "Budoucnost správy adult agentur",
      tagline: "Absolute Control. Infinite Growth.",
      heroDesc: "Nexus Hub je inteligentní ekosystém navržený pro moderní agentury. Kombinujeme pokročilou AI, real-time synchronizaci a nekompromisní důraz na bezpečnost.",
      enterBtn: "Vstoupit do aplikace",
      pillarsTitle: "Klíčové pilíře systému",
      pillars: [
        {
          icon: <Zap size={24} />,
          title: "Maximální efektivita",
          desc: "AI Smart Replies a jednotný inbox zrychlují práci operátorek až o 70%."
        },
        {
          icon: <Users size={24} />,
          title: "Absolutní kontrola",
          desc: "Detailní dashboardy pro každou roli – od majitele po modelku."
        },
        {
          icon: <Shield size={24} />,
          title: "Bezpečnost a Sync",
          desc: "Vlastní Android Relay a Safety Guard pro maximální ochranu týmu i dat."
        }
      ],
      featuresTitle: "Výhody pro váš tým",
      features: [
        { 
          icon: <MessageSquare size={18} />,
          title: "Pro Operátorky", 
          desc: "AI Smart Replies odbaví chaty za vás. Unified Inbox zajistí, že vám žádná zpráva neuteče. Rychlejší a klidnější směny bez neustálého přepínání oken." 
        },
        { 
          icon: <Shield size={18} />,
          title: "Pro Modelky", 
          desc: "Safety Guard a GPS tracking pro bezpečí v terénu. Živý přehled výdělků a rezervací přímo v mobilu. Snadný check-in přes tlačítko 'Klient dorazil'." 
        },
        { 
          icon: <BarChart3 size={18} />,
          title: "Pro Manažery", 
          desc: "Absolutní kontrola nad týmem, real-time analytika a automatické nouzové alerty. Škálování bez stresu z chaosu v datech." 
        },
        {
          icon: <Settings size={18} />,
          title: "Pro Majitele (App Owner)",
          desc: "Správa neomezeného množství agentur, konfigurace předplatných plánů, řízení globálních oprávnění a monitoring serverové infrastruktury na jednom místě."
        }
      ],
      platformTitle: "Kompletní platforma v jednom",
      platformFeatures: [
        { icon: <MessageSquare size={20} />, title: "Unified Inbox", desc: "Všechny konverzace ze všech profilů na jednom místě. SMS relay přes vlastní Android Relay zařízení." },
        { icon: <Calendar size={20} />, title: "Kalendář & Rezervace", desc: "Správa schůzek s podporou incall/outcall. Automatické napojení na Safety Guard při outcall rezervacích." },
        { icon: <Shield size={20} />, title: "Safety Guard", desc: "GPS sledování v reálném čase, panik tlačítko, automatická eskalace s grace period a Telegram notifikace manažerům." },
        { icon: <Smartphone size={20} />, title: "Nexus Relay APK", desc: "Nativní Android aplikace pro relay SMS zpráv. Auto-provisioning SIP/VoIP, device binding a push notifikace." },
        { icon: <BarChart3 size={20} />, title: "Analytika & Statistiky", desc: "Denní statistiky příjmů, počtu rezervací a aktivních profilů. Dashboard pro manažery i majitele s filtry podle agentury." },
        { icon: <Users size={20} />, title: "Hierarchie & Role", desc: "6 úrovní rolí (App Owner → Agency Admin → Manager → Senior Operator → Operator → Model) s dynamickými oprávněními." },
        { icon: <Package size={20} />, title: "Inventář", desc: "Správa vybavení podle lokací s upozorněním na nízké zásoby. Sledování threshold hodnot pro automatické alerty." },
        { icon: <Globe size={20} />, title: "Webové profily", desc: "Správa bio, galerie a online prezentace profilů. Synchronizace s externími platformami." },
        { icon: <Bell size={20} />, title: "Push notifikace", desc: "Firebase Cloud Messaging pro okamžité notifikace o nových zprávách, hovorech a bezpečnostních alertech." },
        { icon: <Lock size={20} />, title: "Bezpečnost", desc: "JWT autentizace, bcrypt hashování, šifrování SIP hesel, rate limiting, CORS whitelist a Helmet security headers." },
        { icon: <MapPin size={20} />, title: "Multi-tenant architektura", desc: "Kompletní izolace dat mezi agenturami. Každá agentura má vlastní role, oprávnění, profily a nastavení." },
        { icon: <Star size={20} />, title: "QA Hub & Referraly", desc: "Kontrola kvality komunikace operátorek. Referral systém pro růst agenturní sítě s odměnami." }
      ],
      footer: "Nexus Systems – Váš nástroj pro efektivní škálování."
    },
    en: {
      title: "The Future of Agency Management",
      tagline: "Absolute Control. Infinite Growth.",
      heroDesc: "Nexus Hub is an intelligent ecosystem designed for modern agencies. We combine advanced AI, real-time sync, and an uncompromising focus on security.",
      enterBtn: "Enter Application",
      pillarsTitle: "Key Pillars of the System",
      pillars: [
        {
          icon: <Zap size={24} />,
          title: "Maximum Efficiency",
          desc: "AI Smart Replies and unified inbox boost operator speed by up to 70%."
        },
        {
          icon: <Users size={24} />,
          title: "Absolute Control",
          desc: "Detailed dashboards for every role – from owner to model."
        },
        {
          icon: <Shield size={24} />,
          title: "Security & Sync",
          desc: "Native Android Relay and Safety Guard for maximum protection."
        }
      ],
      featuresTitle: "Benefits for Your Team",
      features: [
        { 
          icon: <MessageSquare size={18} />,
          title: "For Operators", 
          desc: "AI Smart Replies handle the talking for you. Unified Inbox ensures no lead is lost. Faster, calmer shifts with everything in one place." 
        },
        { 
          icon: <Shield size={18} />,
          title: "For Models", 
          desc: "Safety Guard and GPS tracking for field protection. Live earnings and booking tracker on your phone. Easy check-in with 'Client Arrived' button." 
        },
        { 
          icon: <BarChart3 size={18} />,
          title: "For Managers", 
          desc: "Absolute team oversight, real-time analytics, and automated emergency alerts. Scale without the stress of data chaos." 
        },
        {
          icon: <Settings size={18} />,
          title: "For App Owners",
          desc: "Manage unlimited agencies, configure subscription plans, control global permissions, and monitor server infrastructure — all from one dashboard."
        }
      ],
      platformTitle: "Complete Platform in One Place",
      platformFeatures: [
        { icon: <MessageSquare size={20} />, title: "Unified Inbox", desc: "All conversations from all profiles in one place. SMS relay via dedicated Android Relay devices." },
        { icon: <Calendar size={20} />, title: "Calendar & Bookings", desc: "Appointment management with incall/outcall support. Automatic Safety Guard activation for outcall bookings." },
        { icon: <Shield size={20} />, title: "Safety Guard", desc: "Real-time GPS tracking, panic button, automatic escalation with grace period, and Telegram alerts to managers." },
        { icon: <Smartphone size={20} />, title: "Nexus Relay APK", desc: "Native Android app for SMS relay. Auto-provisioning SIP/VoIP, device binding, and push notifications." },
        { icon: <BarChart3 size={20} />, title: "Analytics & Statistics", desc: "Daily revenue stats, booking counts, and active profiles. Manager and owner dashboards with agency filters." },
        { icon: <Users size={20} />, title: "Hierarchy & Roles", desc: "6 role levels (App Owner → Agency Admin → Manager → Senior Operator → Operator → Model) with dynamic permissions." },
        { icon: <Package size={20} />, title: "Inventory", desc: "Equipment management by location with low-stock alerts. Threshold monitoring for automatic notifications." },
        { icon: <Globe size={20} />, title: "Web Profiles", desc: "Manage bios, galleries, and online presence. Synchronization with external platforms." },
        { icon: <Bell size={20} />, title: "Push Notifications", desc: "Firebase Cloud Messaging for instant alerts on new messages, calls, and safety events." },
        { icon: <Lock size={20} />, title: "Security", desc: "JWT authentication, bcrypt hashing, SIP password encryption, rate limiting, CORS whitelist, and Helmet headers." },
        { icon: <MapPin size={20} />, title: "Multi-Tenant Architecture", desc: "Complete data isolation between agencies. Each agency gets its own roles, permissions, profiles, and settings." },
        { icon: <Star size={20} />, title: "QA Hub & Referrals", desc: "Operator communication quality control. Referral system for agency network growth with rewards." }
      ],
      footer: "Nexus Systems – Your tool for efficient scaling."
    }
  };

  const t = content[lang];

  return (
    <div className="landing-container fade-in" style={{ 
      minHeight: '100dvh',
      height: '-webkit-fill-available',
      background: '#080a0f',
      color: 'white',
      fontFamily: 'inherit',
      overflowX: 'hidden',
      position: 'relative'
    }}>
      {/* Background Orbs */}
      <div style={{ position: 'fixed', top: '-10%', right: '-5%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }}></div>
      <div style={{ position: 'fixed', bottom: '-10%', left: '-5%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }}></div>

      {/* Header */}
      <nav style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: isMobile
          ? `env(safe-area-inset-top, 0px) 1rem 0`
          : '0 5%',
        paddingBottom: 0,
        flexDirection: 'column',
        position: 'sticky',
        top: 0, 
        zIndex: 100, 
        backdropFilter: 'blur(10px)',
        background: 'rgba(8, 10, 15, 0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: isMobile ? '0.6rem 0' : '1.2rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <img src="/nexus_icon.png" alt="Nexus" style={{ width: '26px', height: '26px', borderRadius: '7px' }} />
            <span style={{ fontWeight: '900', fontSize: '1.1rem', letterSpacing: '0.1em' }}>NEXUS</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '2px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button 
                onClick={() => setLang('cz')}
                style={{ padding: '0.3rem 0.7rem', borderRadius: '18px', border: 'none', background: lang === 'cz' ? 'var(--accent-color)' : 'transparent', color: 'white', fontSize: '0.68rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}
              >CZ</button>
              <button 
                onClick={() => setLang('en')}
                style={{ padding: '0.3rem 0.7rem', borderRadius: '18px', border: 'none', background: lang === 'en' ? 'var(--accent-color)' : 'transparent', color: 'white', fontSize: '0.68rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}
              >EN</button>
            </div>
            <button 
              onClick={onLoginClick}
              className="premium-button"
              style={{ padding: isMobile ? '0.45rem 0.9rem' : '0.65rem 1.4rem', borderRadius: '10px', border: 'none', background: 'var(--accent-color)', color: 'white', fontWeight: '800', fontSize: isMobile ? '0.72rem' : '0.82rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)' }}
            >
              {t.enterBtn}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ padding: isMobile ? '2.5rem 5% 2.5rem' : '8rem 5% 4rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div className="glass-card fade-in-up" style={{ display: 'inline-block', padding: '0.5rem 1.5rem', borderRadius: '30px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: 'var(--accent-color)', fontWeight: '800', fontSize: isMobile ? '0.65rem' : '0.75rem', letterSpacing: '0.1em', marginBottom: '2rem' }}>
          {t.tagline.toUpperCase()}
        </div>
        <h1 className="fade-in-up" style={{ fontSize: isMobile ? '2.5rem' : 'clamp(2.5rem, 8vw, 5rem)', fontWeight: '900', lineHeight: 1.1, marginBottom: '2rem', letterSpacing: '-0.02em', background: 'linear-gradient(to bottom, #fff 30%, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {t.title}
        </h1>
        <p className="fade-in-up" style={{ fontSize: isMobile ? '1rem' : 'clamp(1.1rem, 2vw, 1.4rem)', color: 'var(--text-secondary)', maxWidth: '800px', margin: '0 auto 3rem', lineHeight: 1.6 }}>
          {t.heroDesc}
        </p>
        <button 
          onClick={onLoginClick}
          className="premium-button-lg fade-in-up"
          style={{ 
            padding: isMobile ? '1rem 2rem' : '1.25rem 3rem', 
            borderRadius: '16px', 
            border: 'none', 
            background: 'var(--accent-color)', 
            color: 'white', 
            fontWeight: '900', 
            fontSize: isMobile ? '1rem' : '1.1rem', 
            cursor: 'pointer', 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.75rem',
            boxShadow: '0 10px 30px rgba(59, 130, 246, 0.4)',
            transition: 'transform 0.2s'
          }}
        >
          {t.enterBtn} <ArrowRight size={20} />
        </button>
      </section>

      {/* Pillars Section */}
      <section style={{ padding: isMobile ? '3rem 5%' : '6rem 5%', position: 'relative', zIndex: 1 }}>
        <h2 style={{ textAlign: 'center', fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '900', marginBottom: isMobile ? '2rem' : '4rem' }}>{t.pillarsTitle}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
          {t.pillars.map((p, i) => (
            <div key={i} className="glass-card hover-glow" style={{ padding: '2.5rem', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', transition: 'all 0.3s ease' }}>
              <div style={{ width: '50px', height: '50px', background: 'rgba(59,130,246,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)', marginBottom: '1.5rem' }}>
                {p.icon}
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '1rem' }}>{p.title}</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: isMobile ? '3rem 5%' : '6rem 5%', background: 'rgba(59, 130, 246, 0.03)', borderY: '1px solid var(--card-border)', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: isMobile ? '2rem' : '3rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: isMobile ? 'center' : 'left' }}>
            <h2 style={{ fontSize: isMobile ? '1.8rem' : '2.5rem', fontWeight: '900', lineHeight: 1.2, marginBottom: '1.5rem' }}>{t.featuresTitle}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2rem' }}>
              {lang === 'cz'
                ? 'Nexus Hub není jen nástroj, je to váš strategický partner pro nekonečný růst a absolutní kontrolu.'
                : 'Nexus Hub is not just a tool — it is your strategic partner for infinite growth and absolute control.'}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {t.features.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                <div style={{ marginTop: '0.2rem', color: 'var(--success-color)' }}>{f.icon}</div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.5rem' }}>{f.title}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Features Grid */}
      <section style={{ padding: isMobile ? '3rem 5%' : '6rem 5%', position: 'relative', zIndex: 1 }}>
        <h2 style={{ textAlign: 'center', fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '900', marginBottom: '1rem' }}>{t.platformTitle}</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto 3rem' }}>
          {lang === 'cz' ? '90+ API endpointů, 21 databázových modelů, 6 úrovní rolí' : '90+ API endpoints, 21 database models, 6 role levels'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', maxWidth: '1200px', margin: '0 auto' }}>
          {t.platformFeatures.map((pf, i) => (
            <div key={i} className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', display: 'flex', gap: '1rem', alignItems: 'flex-start', transition: 'border-color 0.3s' }}>
              <div style={{ width: '40px', height: '40px', minWidth: '40px', background: 'rgba(59,130,246,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>
                {pf.icon}
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '0.4rem' }}>{pf.title}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>{pf.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: isMobile ? 'calc(2rem + env(safe-area-inset-left)) 5% calc(2rem + env(safe-area-inset-bottom) + env(safe-area-inset-right))' : '4rem 5%', textAlign: 'center', borderTop: '1px solid var(--card-border)', color: 'var(--text-secondary)', fontSize: isMobile ? '0.85rem' : '0.9rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <img src="/nexus_icon.png" alt="Nexus" style={{ width: '24px', height: '24px', borderRadius: '6px' }} />
          <span style={{ fontWeight: '900', letterSpacing: '0.1em', color: 'white' }}>NEXUS SYSTEMS</span>
        </div>
        <p>{t.footer}</p>
        <div style={{ marginTop: '2rem' }}>© {new Date().getFullYear()} Nexus Systems s.r.o. All rights reserved.</div>
      </footer>
    </div>
  );
};

export default LandingPage;
