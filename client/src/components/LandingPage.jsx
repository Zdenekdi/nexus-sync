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

const LandingPage = () => {
  const { setActiveTab, setShowLanding, lang, setLang, isMobile, activeTab } = useNexus();

  const viewingManual = activeTab === 'guide';

  // Auto-scroll to top when switching to manual
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
            onClick={() => { setActiveTab('dashboard'); setShowLanding(false); }}
            style={{ background: 'var(--accent-color)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
          >
            {lang === 'cz' ? 'Vstoupit do aplikace' : 'Enter App'}
          </button>
        </nav>
        <ManualView />
      </div>
    );
  }

  const onLoginClick = () => {
    sessionStorage.setItem('nexus_landing_dismissed', 'true');
    setShowLanding(false);
  };


  const content = {
    cz: {
      title: "Budoucnost správy adult agentur",
      tagline: "Absolutní kontrola. Nekonečný růst.",
      heroDesc: "Nexus Hub je inteligentní ekosystém navržený pro moderní agentury. Kombinujeme pokročilou AI, real-time synchronizaci a nekompromisní důraz na bezpečnost.",
      enterBtn: "Vstoupit do aplikace",
      pillarsTitle: "Klíčové pilíře systému",
      pillars: [
        {
          icon: <Zap size={24} />,
          title: "Maximální efektivita",
          desc: "AI Smart Replies (Q3/Q4 2026) a jednotný inbox zrychlují práci operátorek až o 70%."
        },
        {
          icon: <Users size={24} />,
          title: "Absolutní kontrola",
          desc: "Detailní dashboardy pro každou roli – od majitele po modelku."
        },
        {
          icon: <Shield size={24} />,
          title: "Ochranný balíček PRO",
          desc: "Hands-free SOS, falešné hovory a diskrétní Audio Sentinel. Architektura bez lagů pro absolutní spolehlivost v krizových situacích."
        }
      ],
      featuresTitle: "Výhody pro váš tým",
      features: [
        { 
          icon: <MessageSquare size={18} />,
          title: "Pro Operátorky", 
          desc: "AI Smart Replies (dostupné v Q3/Q4 2026) odbaví chaty za vás. Sjednocená schránka zajistí, že vám žádná zpráva neuteče. Rychlejší a klidnější směny bez neustálého přepínání oken.",
          status: 'coming'
        },
        { 
          icon: <Shield size={18} />,
          title: "Pro Modelky", 
          desc: "Bezpečnostní dohled: Hlasová aktivace SOS ('Pomoc') i se zhasnutým displejem. Audio Sentinel – diskrétní pípání potvrzující tvé bezpečí. Falešný hovor pro ústup ze schůzky a živý přehled výdělků.",
          status: 'beta'
        },
        { 
          icon: <BarChart3 size={18} />,
          title: "Pro Manažery", 
          desc: "Absolutní kontrola nad týmem, real-time analytika a automatické nouzové alerty. Škálování bez stresu z chaosu v datech." 
        }
      ],
      platformFeatures: [
        { icon: <MessageSquare size={20} />, title: "Sjednocená schránka", desc: "Zprávy z AW, SMS a Telegramu v jednom rozhraní.", status: 'beta' },
        { icon: <Shield size={20} />, title: "Bezpečnostní dohled", desc: "GPS tracking, SOS alerty a tichý dohled nad týmem.", status: 'beta' },
        { icon: <Calendar size={20} />, title: "Rezervace & Kalendář", desc: "Správa incall/outcall s automatickou Safety pojistkou.", status: 'beta' },
        { icon: <Smartphone size={20} />, title: "Nexus Relay Brána", desc: "Nativní Android most pro intercepting SMS a hovorů.", status: 'beta' },
        { icon: <BarChart3 size={20} />, title: "Analytika & Příjmy", desc: "Real-time statistiky výdělků a aktivity operátorek.", status: 'beta' },
        { icon: <Users size={20} />, title: "Hierarchie & Role", desc: "6 úrovní oprávnění (Majitel → Manager → Modelka).", status: 'aktivní' },
        { icon: <MessageSquare size={20} />, title: "AI Smart Replies", desc: "Chytré návrhy odpovědí pro bleskové konverze.", status: 'q3/q4 2026' },
        { icon: <Globe size={20} />, title: "Synchronizace webů", desc: "Hromadná správa bio a galerií na inzertních webech.", status: 'beta' },
        { icon: <Zap size={20} />, title: "SIP / VoIP Simulace", desc: "Virtuální corridors pro simulaci hovorů z prohlížeče.", status: 'q1 2027' },
        { icon: <PackageIcon size={20} />, title: "Skladový systém", desc: "Správa vybavení podle lokací s logistikou zásob.", status: 've vývoji' },
        { icon: <Lock size={20} />, title: "Biometrická ochrana", desc: "Pojistka proti nucenému vypnutí SOS (FaceID/PIN).", status: 'beta' },
        { icon: <Bell size={20} />, title: "Push notifikace", desc: "Okamžité výstrahy o zprávách a bezpečnostních stavech.", status: 'aktivní' },
        { icon: <Shield size={20} title="Audio Sentinel" />, title: "Audio Sentinel", desc: "Diskrétní pípání/vibrace potvrzující vaše bezpečí.", status: 'beta' },
        { icon: <Star size={20} />, title: "Auditní logy Hubu", desc: "Kryptograficky podepsaná historie všech systémových akcí.", status: 've vývoji' },
        { icon: <MapPin size={20} />, title: "Multi-tenant izolace", desc: "Absolutní oddělení dat mezi agenturami v síti.", status: 'aktivní' },
        { icon: <MessageSquare size={20} />, title: "AI Překladač", desc: "Real-time překlad mezi operátorkou a klientem.", status: 'aktivní' },
        { icon: <PackageIcon size={20} />, title: "White-label rozhraní", desc: "Možnost vlastního brandingu a domény pro agentury.", status: 'q2 2027' },
        { icon: <Settings size={20} />, title: "Automatické výplaty", desc: "Generování reportů a automatické týdenní odměny.", status: 'q4 2026' },
        { icon: <Smartphone size={20} />, title: "Device Cloud Sync", desc: "Synchronizace dat na pozadí mezi mobilní app a webem.", status: 've vývoji' },
        { icon: <Star size={20} />, title: "Partnerský program", desc: "Referral systém pro růst sítě s provizemi.", status: 'aktivní' }
      ],
      footer: "Nexus Systems – Váš nástroj pro efektivní škálování.",
      faqTitle: "Časté dotazy",
      faq: [
        { q: "Je Nexus Hub bezpečný?", a: "Ano. Používáme JWT autentizaci, bcrypt hashování hesel, rate limiting, šifrované spojení a kompletní izolaci dat mezi agenturami. Bezpečnostní alerty jdou přes Telegram i push notifikace." },
        { q: "Jak funguje SMS Relay?", a: "Nainstalujete naši Android aplikaci Nexus Relay na dedikované zařízení s SIM kartou. Aplikace automaticky přeposílá příchozí SMS do Unified Inboxu a odchozí zprávy odesílá přes skutečné telefonní číslo." },
        { q: "Kolik agentur mohu spravovat?", a: "Jako App Owner můžete spravovat neomezený počet agentur. Každá agentura má vlastní data, role, profily a nastavení — kompletně izolovaná od ostatních." },
        { q: "Mohu systém používat na mobilu?", a: "Ano. Nexus Hub je plně responzivní a funguje ve webovém prohlížeči i jako nativní Android aplikace. Pro modelky nabízíme mobilní rozhraní s Safety Guard a GPS trackingem." },
        { q: "Jak funguje Exit Strategy (Ghost Call)?", a: "Modelka může jedním dotykem naplánovat falešný hovor. Za 20 sekund začne telefon vyzvánět a zobrazí věrohodnou obrazovku příchozího hovoru z agentury, což vytvoří diskrétní záminku k odchodu." },
        { q: "Je možné aplikaci ovládat hlasem?", a: "Ano. Nexus Hub obsahuje Voice Guardian, který naslouchá klíčovým slovům (např. Pomoc, SOS). Při jejich zachycení se spustí tichý alarm i bez dotyku telefonu. Systém je nově vybaven pojistkou proti falešným restartům." },
        { q: "Co je to Audio Sentinel?", a: "Je to diskrétní hlídač, který ti v pravidelných intervalech jemným pípnutím nebo vibrací potvrzuje, že systém je aktivní a monitoruje tvé bezpečí. Zvuk i periodu si můžeš plně přizpůsobit." },
        { q: "Jak probíhá registrace?", a: "Zaregistrujete agenturu, obdržíte zvací kód a ten sdílíte s týmem. Každý člen se přihlásí přes \"Připojit se\" a vybere svou roli (Operátor/Model)." }
      ],
      gettingStartedTitle: "Jak začít?",
      gettingStartedDesc: "Začněte používat Nexus Hub ve třech jednoduchých krocích.",
      steps: [
        { num: "1", title: "Zaregistrujte agenturu", desc: "Klikněte na \"Vstoupit do aplikace\" a zvolte záložku \"Nová agentura\". Vyplňte název agentury, vaše jméno, e-mail a heslo. Po registraci obdržíte unikátní zvací kód." },
        { num: "2", title: "Pozvěte svůj tým", desc: "Sdílejte zvací kód (např. NEXUS-A1B2C3) se svými operátorkami a modelkami. Každý člen se zaregistruje přes záložku \"Připojit se\" na přihlašovací stránce, vloží kód a vybere svou roli." },
        { num: "3", title: "Spravujte vše z jednoho místa", desc: "Po přihlášení máte přístup k dashboardu s kompletním přehledem. Nastavte profily, oprávnění a začněte pracovat." }
      ]
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
          desc: "AI Smart Replies (Q3/Q4 2026) and unified inbox boost operator speed by up to 70%."
        },
        {
          icon: <Users size={24} />,
          title: "Absolute Control",
          desc: "Detailed dashboards for every role – from owner to model."
        },
        {
          icon: <Shield size={24} />,
          title: "Guardian Suite PRO",
          desc: "Hands-free SOS, Ghost Calls, and the discrete Audio Sentinel. Ultra-stable zero-lag architecture for absolute mission-critical reliability."
        }
      ],
      featuresTitle: "Benefits for Your Team",
      features: [
        { 
          icon: <MessageSquare size={18} />,
          title: "For Operators", 
          desc: "AI Smart Replies (available Q3/Q4 2026) handle the talking for you. Unified Inbox ensures no lead is lost. Faster, calmer shifts with everything in one place.",
          status: 'coming'
        },
        { 
          icon: <Shield size={18} />,
          title: "For Models", 
          desc: "Guardian Suite: Hands-free Voice SOS ('Help/SOS') even with the screen locked. Audio Sentinel – discreet pulse beeps confirming your safety. Ghost Calls for exit strategies.",
          status: 'beta'
        },
        { 
          icon: <BarChart3 size={18} />,
          title: "For Managers", 
          desc: "Absolute team oversight, real-time analytics, and automated emergency alerts. Scale without the stress of data chaos." 
        }
      ],
      platformTitle: "Complete Platform in One Place",
      platformFeatures: [
        { icon: <MessageSquare size={20} />, title: "Unified Inbox", desc: "Consolidated messages from AW, SMS, and Telegram.", status: 'beta' },
        { icon: <Shield size={20} />, title: "Safety Guard", desc: "GPS tracking, SOS alerts, and silent team monitoring.", status: 'beta' },
        { icon: <Calendar size={20} />, title: "Bookings & Calendar", desc: "Appointment management with incall/outcall support.", status: 'beta' },
        { icon: <Smartphone size={20} />, title: "Nexus Relay APK", desc: "Native Android bridge for SMS and call intercepting.", status: 'beta' },
        { icon: <BarChart3 size={20} />, title: "Analytics & Revenue", desc: "Real-time earnings stats and operator activity tracking.", status: 'beta' },
        { icon: <Users size={20} />, title: "Hierarchy & Roles", desc: "6 permission levels (Owner → Manager → Model).", status: 'active' },
        { icon: <MessageSquare size={20} />, title: "AI Smart Replies", desc: "Intelligent response suggestions for fast conversion.", status: 'q3/q4 2026' },
        { icon: <Globe size={20} />, title: "Web Sync", desc: "Bulk bio and gallery management across ad sites.", status: 'beta' },
        { icon: <Zap size={20} />, title: "SIP / VoIP Tunneling", desc: "Virtual corridors for browser-based call simulation.", status: 'q1 2027' },
        { icon: <PackageIcon size={20} />, title: "Inventory System", desc: "Equipment management by location with asset logistics.", status: 'progress' },
        { icon: <Lock size={20} />, title: "Biometric Protection", desc: "Anti-forced SOS cancellation (FaceID/PIN).", status: 'beta' },
        { icon: <Bell size={20} />, title: "Push Notifications", desc: "Instant alerts for messages and safety event status.", status: 'active' },
        { icon: <Shield size={20} />, title: "Audio Sentinel", desc: "Discreet pulse beeps/vibrations to confirm safety.", status: 'beta' },
        { icon: <Star size={20} />, title: "Audit Logs", desc: "Cryptographically signed history of all system actions.", status: 'progress' },
        { icon: <MapPin size={20} />, title: "Multi-tenant Isolation", desc: "Absolute data separation between network agencies.", status: 'active' },
        { icon: <MessageSquare size={20} />, title: "AI Translator", desc: "Real-time translation between operator and client.", status: 'active' },
        { icon: <PackageIcon size={20} />, title: "White-label Dashboard", desc: "Custom branding and domains for enterprise agencies.", status: 'q2 2027' },
        { icon: <Settings size={20} />, title: "Automated Payouts", desc: "Report generation and automated weekly commissions.", status: 'q4 2026' },
        { icon: <Smartphone size={20} />, title: "Device Cloud Sync", desc: "Background data sync between mobile app and web.", status: 'progress' },
        { icon: <Star size={20} />, title: "Network Program", desc: "Referral system for network growth with commissions.", status: 'active' }
      ],
      footer: "Nexus Systems – Your tool for efficient scaling.",
      faqTitle: "Frequently Asked Questions",
      faq: [
        { q: "Is Nexus Hub secure?", a: "Yes. We use JWT authentication, bcrypt password hashing, rate limiting, encrypted connections, and complete data isolation between agencies. Safety alerts go via Telegram and push notifications." },
        { q: "How does SMS Relay work?", a: "Install our Nexus Relay Android app on a dedicated device with a SIM card. The app automatically forwards incoming SMS to the Unified Inbox and sends outgoing messages via real phone numbers." },
        { q: "How many agencies can I manage?", a: "As an App Owner, you can manage unlimited agencies. Each agency has its own data, roles, profiles, and settings — completely isolated from others." },
        { q: "Can I use it on mobile?", a: "Yes. Nexus Hub is fully responsive and works in web browsers and as a native Android app. For models, we offer a mobile interface with Safety Guard and GPS tracking." },
        { q: "How does Exit Strategy (Ghost Call) work?", a: "A model can trigger a fake call with one touch. After a delay, the phone will ring with a realistic 'Agency Relay' screen, providing a discreet excuse to leave any situation." },
        { q: "Can I use voice commands for safety?", a: "Yes. Our Voice Guardian listens for emergency keywords like 'Help' or 'SOS'. If detected, it triggers a silent emergency protocol instantly, without needing to touch the device. Now with enhanced stability safeguards." },
        { q: "What is Audio Sentinel?", a: "It is a discreet companion that provides periodic pulse beeps or vibrations to confirm the system is actively monitoring your safety. You can fully customize the sound and interval." },
        { q: "How does registration work?", a: "Register your agency, receive an invite code, and share it with your team. Each member signs up via \"Join Agency\" and selects their role (Operator/Model)." }
      ],
      gettingStartedTitle: "Getting Started",
      gettingStartedDesc: "Start using Nexus Hub in three simple steps.",
      steps: [
        { num: "1", title: "Register Your Agency", desc: "Click \"Enter Application\" and select the \"New Agency\" tab. Fill in your agency name, your name, email, and password. After registration you'll receive a unique invite code." },
        { num: "2", title: "Invite Your Team", desc: "Share the invite code (_err.g. NEXUS-A1B2C3) with your operators and models. Each member registers via the \"Join Agency\" tab on the login page and selects their role." },
        { num: "3", title: "Manage Everything in One Place", desc: "Once logged in, you have access to a full dashboard. Set up profiles, permissions, and start working." }
      ]
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

      <LanguageSwitcher 
        current={lang} 
        onSelect={setLang} 
        isMobile={isMobile} 
      />

      {/* Header - COMPLETELY DELETED TO REMOVE WHITE BARS */}
      {null}

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
        <div className="fade-in-up" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1.25rem' }}>
          <button 
            onClick={onLoginClick}
            className="premium-button-lg"
            data-testid="landing-enter-button"
            id="landing-enter-button"
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

          <button 
            onClick={() => setActiveTab('guide')}
            style={{ 
              padding: isMobile ? '1rem 2rem' : '1.25rem 3rem', 
              borderRadius: '16px', 
              border: '1px solid rgba(255,255,255,0.1)', 
              background: 'rgba(255,255,255,0.05)', 
              color: 'white', 
              fontWeight: '800', 
              fontSize: isMobile ? '1rem' : '1.1rem', 
              cursor: 'pointer', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(10px)'
            }}
          >
            <BookOpen size={20} /> {lang === 'cz' ? 'Manuál registrace' : 'Registration Manual'}
          </button>
        </div>

        {/* Download App CTA */}
        <ScrollReveal delay={0.5}>
          <div style={{ marginTop: '4rem', display: 'flex', justifyContent: 'center' }}>
            <a 
              href="https://firebasestorage.googleapis.com/v0/b/trainer-app-zdenekdi.firebasestorage.app/o/releases%2FTrainerApp-v2.0.7-release.apk?alt=media" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '1.5rem 2rem',
                borderRadius: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem',
                textDecoration: 'none',
                color: 'white',
                maxWidth: '500px',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'var(--accent-color)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ 
                width: '56px', 
                height: '56px', 
                background: 'linear-gradient(135deg, #3DDC84 0%, #073042 100%)', 
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(61, 220, 132, 0.3)'
              }}>
                <Smartphone size={32} color="white" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'white', marginBottom: '2px' }}>{t.downloadTitle}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{t.downloadDesc}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3DDC84', fontWeight: '800', fontSize: '0.9rem' }}>
                  <Zap size={16} fill="#3DDC84" /> {t.downloadBtn}
                </div>
              </div>
            </a>
          </div>
        </ScrollReveal>
      </section>

      {/* Pillars Section */}
      <section style={{ padding: isMobile ? '3rem 5%' : '6rem 5%', position: 'relative', zIndex: 1 }}>
        <ScrollReveal>
          <h2 style={{ textAlign: 'center', fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '900', marginBottom: isMobile ? '2rem' : '4rem' }}>{t.pillarsTitle}</h2>
        </ScrollReveal>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
          {t.pillars.map((p, i) => (
            <ScrollReveal key={i} delay={i * 0.15}>
              <div className="glass-card hover-glow" style={{ padding: '2.5rem', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', transition: 'all 0.3s ease' }}>
                <div style={{ width: '50px', height: '50px', background: 'rgba(59,130,246,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)', marginBottom: '1.5rem' }}>
                  {p.icon}
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '1rem' }}>{p.title}</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{p.desc}</p>
              </div>
            </ScrollReveal>
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
                  <h4 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.5rem', display: 'flex', alignItems: 'center' }}>
                    {f.title}
                    {f.status && <StatusBadge type={f.status} lang={lang} />}
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Features Grid */}
      <section style={{ padding: isMobile ? '3rem 5%' : '6rem 5%', position: 'relative', zIndex: 1 }}>
        <ScrollReveal>
          <h2 style={{ textAlign: 'center', fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '900', marginBottom: '1rem' }}>{t.platformTitle}</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto 3rem' }}>
            {lang === 'cz' ? '90+ API endpointů, 21 databázových modelů, 6 úrovní rolí' : '90+ API endpoints, 21 database models, 6 role levels'}
          </p>
        </ScrollReveal>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', maxWidth: '1200px', margin: '0 auto' }}>
          {t.platformFeatures.map((pf, i) => (
            <ScrollReveal key={i} delay={Math.min(i * 0.08, 0.4)}>
              <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', display: 'flex', gap: '1rem', alignItems: 'flex-start', transition: 'border-color 0.3s' }}>
                <div style={{ width: '40px', height: '40px', minWidth: '40px', background: 'rgba(59,130,246,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>
                  {pf.icon}
                </div>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '0.4rem', display: 'flex', alignItems: 'center' }}>
                    {pf.title}
                    {pf.status && <StatusBadge type={pf.status} lang={lang} />}
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>{pf.desc}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Getting Started Section */}
      <section style={{ padding: isMobile ? '3rem 5%' : '6rem 5%', background: 'rgba(16, 185, 129, 0.03)', borderTop: '1px solid var(--card-border)', borderBottom: '1px solid var(--card-border)', position: 'relative', zIndex: 1 }}>
        <ScrollReveal>
          <h2 style={{ textAlign: 'center', fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '900', marginBottom: '0.75rem' }}>{t.gettingStartedTitle}</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto 3rem' }}>
            {t.gettingStartedDesc}
          </p>
        </ScrollReveal>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
          {t.steps.map((step, i) => (
            <ScrollReveal key={i} delay={i * 0.15}>
              <div className="glass-card" style={{ padding: '2rem', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', textAlign: 'center', position: 'relative' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.25rem', fontSize: '1.25rem', fontWeight: '900', color: 'white',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                }}>
                  {step.num}
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.75rem' }}>{step.title}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
        <ScrollReveal delay={0.3}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', marginTop: '3rem' }}>
            <button 
              onClick={onLoginClick}
              className="primary-button"
              style={{
                background: 'var(--success-color)',
                color: 'white',
                border: 'none',
                padding: '1.2rem 2.5rem',
                borderRadius: '16px',
                fontSize: '1.1rem',
                fontWeight: '900',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                boxShadow: '0 10px 40px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {lang === 'cz' ? 'Zaregistrovat agenturu' : 'Register Your Agency'} <ArrowRight size={18} />
            </button>

            <button 
              onClick={() => setActiveTab('guide')}
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '1.2rem 2.5rem',
                borderRadius: '16px',
                fontSize: '1.1rem',
                fontWeight: '900',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'all 0.3s ease'
              }}
            >
              <BookOpen size={20} /> {lang === 'cz' ? 'Detailní manuál' : 'Detailed Manual'}
            </button>
          </div>
        </ScrollReveal>
      </section>

      {/* FAQ Section */}
      <section style={{ padding: isMobile ? '3rem 5%' : '6rem 5%', position: 'relative', zIndex: 1 }}>
        <ScrollReveal>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <HelpCircle size={24} color="var(--accent-color)" />
            <h2 style={{ textAlign: 'center', fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '900', margin: 0 }}>{t.faqTitle}</h2>
          </div>
        </ScrollReveal>
        <div style={{ maxWidth: '700px', margin: '2rem auto 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {t.faq.map((item, i) => (
            <ScrollReveal key={i} delay={i * 0.1}>
              <FAQItem question={item.q} answer={item.a} />
            </ScrollReveal>
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
