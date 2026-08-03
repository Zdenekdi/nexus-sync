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
  ArrowLeft,
  BookOpen,
  Check,
  Send,
  CreditCard,
  Phone,
  Database,
  Menu,
  X
} from 'lucide-react';

import { useNexus } from '../context/ContextHook';
import ManualView from './Views/ManualView';
import DownloadsView from './Views/DownloadsView';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const viewingManual = activeTab === 'guide';
  const viewingDownloads = activeTab === 'downloads';

  useEffect(() => { window.scrollTo(0, 0); }, [viewingManual, viewingDownloads]);

  const t = {
    cz: {
      hero: {
        badge: "PLATFORMA PRO PROVOZ AGENTURY",
        title: "Komunikace, rezervace a bezpečnost lidí v terénu.",
        desc: "Místo Excelu a soukromých telefonů: sdílená schránka, kalendář rezervací, fakturace — a bezpečnostní dohled, který hlídá check-iny a rozešle SOS celému týmu naráz.",
        ctaRegister: "Založit agenturu",
        ctaLogin: "Přihlásit se",
        ctaDemo: "Podívat se na ukázku",
      },
      trust: [
        "Bez instalace, běží v prohlížeči",
        "Česky i anglicky",
        "Tarif změníte kdykoli"
      ],
      nav: { features: "Funkce", safety: "Bezpečnost", pricing: "Ceník", downloads: "Ke stažení", guide: "Manuál" },
      heroVideoCaption: "Bezpečnostní dohled — přehled probíhajících schůzek a check-inů.",
      features: [
        { icon: Shield, title: "Safety Guard™", desc: "Real-time SOS a monitoring výjezdů." },
        { icon: Zap, title: "AI Smart Replies", desc: "Automatizované odpovědi a překlady." },
        { icon: Database, title: "Public API", desc: "REST rozhraní pro vaše vlastní integrace." },
        { icon: Globe, title: "Global Sync", desc: "Synchronizace napříč všemi zařízeními." },
        { icon: BarChart3, title: "Deep Analytics", desc: "Tržby a konverze pod mikroskopem." },
        { icon: CreditCard, title: "Stripe Billing", desc: "Automatické platby kartou a správa předplatného." }
      ],
      sectionEyebrows: { pillars: "NA ČEM TO STOJÍ", features: "CO JE V CENĚ" },
      pricingTitle: "Plány a ceny",
      pricingNote: "Ceny za měsíc, bez DPH. Účtuje se počet profilů, ne počet operátorek.",
      // Návrh sem psal i „sdílení polohy". To je zamčená funkce — viz featureLocks.js —
      // takže se inzeruje jen to, co dnes opravdu funguje.
      pricingSafetyNote: "SOS tlačítko a check-iny jsou ve všech plánech včetně nejnižšího. Bezpečnost není příplatek.",
      finalCta: {
        title: "Přejděte z Excelu za jedno odpoledne.",
        desc: "Založíte agenturu, pozvete lidi zvacím kódem a rozdělíte role. Zkoušet můžete naprázdno, bez zadávání karty.",
        primary: "Založit agenturu",
        secondary: "Napsat nám"
      },
      footer: { tagline: "Provoz a bezpečnost pro agentury", privacy: "Ochrana osobních údajů", guide: "Manuál", downloads: "Ke stažení" },
      plans: [
        { id: 'starter_monthly', name: 'Starter', price: '290 Kč', desc: 'Ideální pro začínající týmy.', features: ['Správa 5 profilů', 'SOS alerty', 'Manuální SMS routing'] },
        { id: 'pro_monthly', name: 'Professional', price: '990 Kč', desc: 'Pro rostoucí profesionály.', features: ['Správa 10 profilů', 'AI Optimalizace', 'Pokročilé reporty'], popular: true },
        { id: 'agency_monthly', name: 'Agency', price: '2 490 Kč', desc: 'Širší provoz pro agentury.', features: ['Správa 20 profilů', 'API Přístup', 'Prioritní podpora'] }
      ],
      faqTitle: "Časté dotazy",
      faqs: [
        { q: "Kdo vidí naše data?", a: "Data jsou oddělená po agenturách — vidíte jen to, co patří té vaší. Uvnitř agentury pak rozhodují role: kdo je smí číst a kdo měnit. Přístup si spravujete sami." },
        { q: "Jak funguje SOS a bezpečnost?", a: "Před schůzkou se založí relace a chodí z ní check-iny. Když check-in nepřijde včas nebo se stiskne SOS tlačítko, dostane celý tým upozornění naráz. Sdílení polohy v reálném čase a hlasové SOS zatím dokončujeme — v aplikaci je najdete zamčené, ne rozbité." },
        { q: "Nabízíte API pro vývojáře?", a: "Ano, v rámci tarifu Agency poskytujeme přístup k našemu Public REST API, díky kterému můžete Nexus propojit s vašimi interními systémy nebo vlastními boty." },
        { q: "Jak mohu zaplatit?", a: "Podporujeme okamžité platby kartou přes Stripe. Správa karet, faktur a předplatného probíhá přes zabezpečený Stripe portál." },
        { q: "Dá se tarif později změnit?", a: "Samozřejmě. Upgrade i downgrade je možný kdykoliv přímo z vašeho administračního panelu." }
      ],
      videos: [
        { id: 'analytics', src: '/analytics.mp4', poster: '/thumb_analytics.jpg', title: 'Business pod kontrolou', desc: 'Zapomeňte na tabulky. Okamžitý přehled o tržbách, konverzích a výkonu celého týmu.', features: ['Real-time tržby', 'Výpočet provizí', 'VIP Management'] },
        { id: 'operations', src: '/operations.mp4', poster: '/thumb_operations.jpg', title: 'Operace jako na dlaní', desc: 'Správa profilů, hierarchie a komunikace na jednom místě. Plná kontrola bez chaosu.', features: ['Správa profilů', 'Týmová hierarchie', 'CRM & Komunikace'], reverse: true }
      ]
    },
    en: {
      hero: {
        badge: "AGENCY OPERATIONS PLATFORM",
        title: "Messaging, bookings and the safety of people in the field.",
        desc: "Instead of spreadsheets and private phones: a shared inbox, a booking calendar, billing — and safety oversight that watches check-ins and sends SOS to the whole team at once.",
        ctaRegister: "Start an agency",
        ctaLogin: "Sign in",
        ctaDemo: "See it in action",
      },
      trust: [
        "No install, runs in your browser",
        "Czech and English",
        "Change your plan anytime"
      ],
      nav: { features: "Features", safety: "Safety", pricing: "Pricing", downloads: "Downloads", guide: "Manual" },
      heroVideoCaption: "Safety oversight — bookings in progress and their check-ins.",
      features: [
        { icon: Shield, title: "Safety Guard™", desc: "Real-time SOS and outcall monitoring." },
        { icon: Zap, title: "AI Smart Replies", desc: "Automated responses and translations." },
        { icon: Database, title: "Public API", desc: "REST interface for your own integrations." },
        { icon: Globe, title: "Global Sync", desc: "Synchronization across all devices." },
        { icon: BarChart3, title: "Deep Analytics", desc: "Revenue and conversion insights." },
        { icon: CreditCard, title: "Stripe Billing", desc: "Automated card payments and subscription management." }
      ],
      sectionEyebrows: { pillars: "WHAT IT'S BUILT ON", features: "WHAT'S INCLUDED" },
      pricingTitle: "Plans & Pricing",
      pricingNote: "Prices per month, excl. VAT. You are billed per profile, not per operator.",
      pricingSafetyNote: "The SOS button and check-ins are in every plan, including the cheapest one. Safety is not an add-on.",
      finalCta: {
        title: "Move off spreadsheets in one afternoon.",
        desc: "Create the agency, invite people with a code and assign roles. You can try it empty, no card required.",
        primary: "Start an agency",
        secondary: "Get in touch"
      },
      footer: { tagline: "Operations and safety for agencies", privacy: "Privacy policy", guide: "Manual", downloads: "Downloads" },
      plans: [
        { id: 'starter_monthly', name: 'Starter', price: '€12', desc: 'Perfect for starting teams.', features: ['5 Profiles', 'SOS Alerts', 'Manual SMS Routing'] },
        { id: 'pro_monthly', name: 'Professional', price: '€39', desc: 'For growing professionals.', features: ['10 Profiles', 'AI Optimization', 'Advanced Reports'], popular: true },
        { id: 'agency_monthly', name: 'Agency', price: '€99', desc: 'Broader operations for agencies.', features: ['20 Profiles', 'API Access', 'Priority Support'] }
      ],
      faqTitle: "Frequently Asked Questions",
      faqs: [
        { q: "Who can see our data?", a: "Data is separated per agency — you only ever see your own. Inside the agency, roles decide who may read and who may change what. You manage that access yourselves." },
        { q: "How does SOS & Safety work?", a: "A session is opened before a booking and sends check-ins. If a check-in is missed or the SOS button is pressed, the whole team is alerted at once. Live location sharing and voice SOS are still being finished — you'll find them locked in the app rather than half-working." },
        { q: "Do you offer API for developers?", a: "Yes, the Agency plan provides access to our Public REST API, allowing you to connect Nexus with your internal tools or custom bots." },
        { q: "How can I pay?", a: "We support instant card payments via Stripe. Cards, invoices, and subscriptions are managed through the secure Stripe portal." },
        { q: "Can I change my plan later?", a: "Absolutely. You can upgrade or downgrade your subscription at any time via the administration panel." }
      ],
      videos: [
        { id: 'analytics', src: '/analytics.mp4', poster: '/thumb_analytics.jpg', title: 'Business in Control', desc: 'Forget spreadsheets. Instant overview of revenue, conversions and team performance.', features: ['Real-time Revenue', 'Commission Calculator', 'VIP Management'] },
        { id: 'operations', src: '/operations.mp4', poster: '/thumb_operations.jpg', title: 'Operations at a Glance', desc: 'Profile management, hierarchy and communication in one place. Full control without the chaos.', features: ['Profile Management', 'Team Hierarchy', 'CRM & Communication'], reverse: true }
      ]
    }
  }[lang];

  if (viewingManual || viewingDownloads) {
    return (
      <div style={{ background: '#040507', minHeight: '100vh', color: 'white', fontFamily: 'Inter, sans-serif' }}>
        <nav style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'rgba(4,5,7,0.8)', backdropFilter: 'blur(10px)', zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <button onClick={() => { setActiveTab('dashboard'); navigate('/'); }} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
        {viewingManual ? <ManualView /> : <DownloadsView />}
      </div>
    );
  }

  // Jeden seznam pro desktopovou hlavičku i mobilní overlay. Dřív to byly dvě
  // ručně udržované kopie, takže se položky mohly rozejít a na telefonu chybět.
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  const navItems = [
    { label: t.nav.features, action: () => scrollTo('features') },
    { label: t.nav.safety, action: () => scrollTo('safety') },
    { label: t.nav.pricing, action: () => scrollTo('pricing') },
    { label: t.nav.downloads, action: () => navigate('/downloads', 'downloads') },
    { label: t.nav.guide, action: () => setActiveTab('guide') }
  ];

  return (
    <div data-testid="landing-page-container" className="landing-page" style={{ minHeight: '100vh', background: '#040507', color: 'white', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>
      
      {/* BACKGROUND EFFECTS */}
      <div style={{ position: 'fixed', top: '0', left: '50%', transform: 'translateX(-50%)', width: '100%', height: '100%', background: 'radial-gradient(circle at 50% -20%, rgba(59, 130, 246, 0.15), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-20%', left: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08), transparent 70%)', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0 }} />

      {/* NAVBAR-LIKE HEADER */}
      <div style={{ position: 'fixed', top: 0, width: '100%', zIndex: 1000, padding: '1.5rem 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backdropFilter: 'blur(10px)', background: 'rgba(4,5,7,0.4)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/nexus_icon.png" alt="Nexus" style={{ width: '32px', height: '32px', borderRadius: '8px', boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)' }} />
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontWeight: '900', letterSpacing: '0.1em', fontSize: '1.1rem' }}>NEXUS HUB</div>
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.16em', color: '#60a5fa', fontWeight: '700' }}>
              {lang === 'cz' ? 'PROVOZ A BEZPEČNOST' : 'OPERATIONS & SAFETY'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {!isMobile && (
            <div style={{ display: 'flex', gap: '1.5rem', marginRight: '1rem' }}>
              {navItems.map(item => (
                <button key={item.label} onClick={item.action} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', transition: 'color 0.2s' }}>{item.label}</button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
            {['cz', 'en'].map(l => (
              <button key={l} onClick={() => setLang(l)} style={{ padding: '4px 10px', borderRadius: '8px', border: 'none', background: lang === l ? 'rgba(59, 130, 246, 0.2)' : 'transparent', color: lang === l ? '#3b82f6' : 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s' }}>{l.toUpperCase()}</button>
            ))}
          </div>
          {!isMobile && (
            <>
              <button onClick={() => navigate('/login', 'login')} style={{ background: 'transparent', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.12)', padding: '9px 18px', borderRadius: '12px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                {t.hero.ctaLogin}
              </button>
              <button onClick={() => navigate('/register', 'register-agency')} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 22px', borderRadius: '12px', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', transition: 'transform 0.2s' }}>
                {t.hero.ctaRegister}
              </button>
            </>
          )}
          {isMobile && (
            <button onClick={() => setMobileMenuOpen(true)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}>
              <Menu size={24} />
            </button>
          )}
        </div>
      </div>

      {/* MOBILE MENU OVERLAY */}
      {isMobile && mobileMenuOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(4,5,7,0.95)', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
          <button onClick={() => setMobileMenuOpen(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}>
            <X size={28} />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
            {navItems.map(item => (
              <button key={item.label} onClick={() => { setMobileMenuOpen(false); item.action(); }} style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: '800', fontSize: '1.5rem', cursor: 'pointer' }}>{item.label}</button>
            ))}
            <button onClick={() => { setMobileMenuOpen(false); navigate('/login', 'login'); }} style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '13px 28px', borderRadius: '15px', fontWeight: '800', fontSize: '1.1rem', cursor: 'pointer', marginTop: '1rem' }}>
              {t.hero.ctaLogin}
            </button>
            <button onClick={() => { setMobileMenuOpen(false); navigate('/register', 'register-agency'); }} style={{ background: 'var(--accent-color)', color: 'white', border: 'none', padding: '15px 30px', borderRadius: '15px', fontWeight: '900', fontSize: '1.2rem', cursor: 'pointer' }}>
              {t.hero.ctaRegister}
            </button>
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      <section style={{ padding: isMobile ? '7rem 5% 3rem' : '11rem 5% 5rem', position: 'relative', zIndex: 1 }}>
        <ScrollReveal>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.05fr 1fr', gap: isMobile ? '3rem' : '4rem', alignItems: 'center' }}>
            <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 1.2rem', borderRadius: '30px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontWeight: '900', fontSize: '0.65rem', letterSpacing: '0.14em', marginBottom: '2rem' }}>
                <Shield size={13} />
                {t.hero.badge}
              </div>
              <h1 style={{ fontSize: isMobile ? '2.1rem' : '3rem', fontWeight: '900', lineHeight: 1.1, marginBottom: '1.5rem', letterSpacing: '-0.035em', textWrap: 'pretty', background: 'linear-gradient(to bottom, #fff 40%, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'pre-line' }}>
                {t.hero.title}
              </h1>
              <p style={{ fontSize: isMobile ? '1rem' : '1.15rem', color: 'rgba(255,255,255,0.5)', maxWidth: '54ch', margin: isMobile ? '0 auto 2rem' : '0 0 2rem', lineHeight: 1.65 }}>
                {t.hero.desc}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start', gap: '0.85rem', marginBottom: '2rem' }}>
                <button onClick={() => navigate('/register', 'register-agency')} style={{ padding: '1rem 1.8rem', borderRadius: '14px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: '800', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 20px 40px -12px rgba(59, 130, 246, 0.5)', transition: 'all 0.3s ease' }}>
                  {t.hero.ctaRegister} <ArrowRight size={17} />
                </button>
                {/* Kotva pro e2e login helper (tests/helpers/auth.js). Dřív se helper
                    trefoval podle textu tlačítka, takže změna marketingového textu
                    rozbila přihlášení ve všech specech. Musí sedět na prvku, který
                    vede na /login a renderuje se i na mobilu — proto tady, ne
                    v hlavičce (ta je celá pod `!isMobile`). */}
                <button data-testid="landing-enter-btn" onClick={() => navigate('/login', 'login')} style={{ padding: '1rem 1.6rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)', color: 'white', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all 0.3s ease' }}>
                  {t.hero.ctaLogin}
                </button>
                {/* Návrh tu měl „Prohlídka za 3 minuty“. Takové video nemáme, tak
                    tlačítko odscrolluje na ukázky, které v repu opravdu jsou. */}
                <button onClick={() => scrollTo('safety')} style={{ padding: '1rem 0.2rem', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'underline', textUnderlineOffset: '4px', textDecorationColor: 'rgba(255,255,255,0.2)' }}>
                  {t.hero.ctaDemo} <ChevronDown size={15} />
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start', gap: '1.4rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>
                {t.trust.map(item => (
                  <span key={item} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Check size={13} color="#10b981" />{item}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div style={{ position: 'relative', padding: '8px', background: 'rgba(15, 23, 42, 0.45)', borderRadius: '26px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.75)', backdropFilter: 'blur(20px)' }}>
                <video poster="/thumb_safety.jpg" controls playsInline preload="metadata" style={{ width: '100%', borderRadius: '20px', display: 'block', objectFit: 'cover' }}>
                  <source src="/safety.mp4" type="video/mp4" />
                </video>
              </div>
              <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.85rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                <Shield size={13} />{t.heroVideoCaption}
              </p>
            </div>
          </div>
        </ScrollReveal>
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
          {/* SMS Relay */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.2))' }}>
            <MessageSquare size={24} color="#3b82f6" />
            <span style={{ fontSize: '0.85rem', fontWeight: '900', color: 'white', letterSpacing: '0.1em' }}>SMS RELAY</span>
          </div>
        </div>
      </section>

      {/* Sekce se statistikami je pryč záměrně. Uváděla „25+ agentur / 1,2 M zpráv"
          v češtině a „50+ / 2,4 M" v angličtině — o téže firmě. Nešlo tedy o čísla,
          která by někdo změřil. Radši žádná než vymyšlená. */}

      {/* NA ČEM TO STOJÍ — video bloky */}
      <section id="safety" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
        <div style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', fontWeight: '800', paddingTop: '5rem' }}>
          {t.sectionEyebrows.pillars}
        </div>
        {t.videos.map(v => <VideoCard key={v.id} {...v} />)}
      </section>

      {/* CO JE V CENĚ */}
      <section id="features" style={{ padding: '5rem 5% 6rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', fontWeight: '800', marginBottom: '1.5rem' }}>
            {t.sectionEyebrows.features}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1.5rem' }}>
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

      {/* PRICING SECTION */}
      <section id="pricing" style={{ padding: '4rem 5% 6rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: isMobile ? '2rem' : '2.6rem', fontWeight: '900', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>{t.pricingTitle}</h2>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>{t.pricingNote}</p>
          </div>
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
                  <button onClick={() => navigate('/register', 'register-agency')} style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: 'none', background: p.popular ? '#3b82f6' : 'rgba(255,255,255,0.05)', color: 'white', fontWeight: '800', cursor: 'pointer', transition: 'all 0.3s' }}>{t.hero.ctaRegister}</button>
                </div>
              </ScrollReveal>
            ))}
          </div>
          <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Shield size={16} color="#10b981" style={{ flex: 'none' }} />
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{t.pricingSafetyNote}</span>
          </div>
        </div>
      </section>

      {/* FAQ SECTION — statický seznam, ne rozbalovačka.
          Rozbalovačka měla `maxHeight: 200px`, což delší odpovědi (třeba tu
          o zamčených funkcích) uřízlo bez varování. */}
      <section style={{ padding: '5rem 5%', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <h2 style={{ fontSize: isMobile ? '1.7rem' : '2rem', fontWeight: '900', marginBottom: '2rem' }}>{t.faqTitle}</h2>
          <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
            {t.faqs.map((f, i) => (
              <div key={i} style={{ padding: '1.25rem 1.5rem', borderBottom: i < t.faqs.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.5rem' }}>
                  <HelpCircle size={15} color="#60a5fa" style={{ flex: 'none' }} />
                  <span style={{ fontSize: '0.95rem', fontWeight: '700' }}>{f.q}</span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, margin: 0, paddingLeft: '1.6rem' }}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ZÁVĚREČNÉ CTA */}
      <section style={{ padding: '0 5% 5rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '28px', background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.02))', padding: isMobile ? '2.5rem 1.75rem' : '3rem 3.5rem', display: 'flex', alignItems: 'center', gap: '2.25rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <h2 style={{ fontSize: isMobile ? '1.6rem' : '1.9rem', fontWeight: '900', letterSpacing: '-0.025em', margin: '0 0 0.6rem' }}>{t.finalCta.title}</h2>
            <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.45)', margin: 0, maxWidth: '56ch', lineHeight: 1.6 }}>{t.finalCta.desc}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/register', 'register-agency')} style={{ padding: '0.9rem 1.5rem', borderRadius: '12px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: '800', fontSize: '0.95rem', cursor: 'pointer' }}>
              {t.finalCta.primary}
            </button>
            {/* Stejná adresa, na kterou míří hlášení chyb v aplikaci (BugReportModal). */}
            <a href="mailto:support@nexus-hub.ai" style={{ padding: '0.9rem 1.4rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.75)', fontWeight: '700', fontSize: '0.95rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              {t.finalCta.secondary}
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '2rem 5% 3rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
        <img src="/nexus_systems_logo.png" alt="Nexus Systems" style={{ height: '26px', display: 'block', opacity: 0.75 }} />
        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)' }}>
          © {new Date().getFullYear()} Nexus Systems · {t.footer.tagline}
        </span>
        <div style={{ flex: 1 }} />
        {/* Jen odkazy, které někam vedou. Návrh měl i „Podmínky" a „Stav služby" —
            takové stránky v aplikaci nejsou, tak tu nejsou ani odkazy na ně. */}
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
          <a href="/privacy" style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>{t.footer.privacy}</a>
          <button onClick={() => setActiveTab('guide')} style={{ background: 'transparent', border: 'none', padding: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>{t.footer.guide}</button>
          <button onClick={() => navigate('/downloads', 'downloads')} style={{ background: 'transparent', border: 'none', padding: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>{t.footer.downloads}</button>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
