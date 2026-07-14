import React, { Suspense, useState } from "react";
import { 
  Loader2, Menu, LayoutDashboard, MessageSquare, Calendar, 
  Shield, Users, Globe, Smartphone, FileSearch, BarChart3, 
  Activity, Settings, UserCheck, Terminal, Lock, Mail, Eye, EyeOff
} from 'lucide-react';
import { useNexus } from './context/ContextHook';
import GlobalAppStyles from './styles/GlobalAppStyles';
import PremiumSelector from './components/UI/PremiumSelector';
import ErrorBoundary from './ErrorBoundary';
import { lazyWithRetry } from './utils/lazyWithRetry';
import UpdateBanner from './components/UpdateBanner';

// Lazy load heavy components
const Sidebar = lazyWithRetry(() => import('./components/Navigation/Sidebar'));
const MobileBottomNav = lazyWithRetry(() => import('./components/Navigation/MobileBottomNav'));
const ViewRouter = lazyWithRetry(() => import('./components/Navigation/ViewRouter'));
const LandingPage = lazyWithRetry(() => import('./components/LandingPage'));
const Onboarding = lazyWithRetry(() => import('./components/Onboarding'));
const LoginScreen = lazyWithRetry(() => import('./components/LoginScreen'));
const LogoutScreen = lazyWithRetry(() => import('./components/LogoutScreen'));
const SystemBanners = lazyWithRetry(() => import('./components/UI/SystemBanners'));
const GlobalModalContainer = lazyWithRetry(() => import('./components/Modals/GlobalModalContainer'));
const NotificationSystem = lazyWithRetry(() => import('./components/Notifications/NotificationSystem'));
const TeamChatFloat = lazyWithRetry(() => import('./components/TeamChatFloat'));
const RelayModeView = lazyWithRetry(() => import('./components/Views/RelayModeView'));
const PrivacyPolicy = lazyWithRetry(() => import('./components/PrivacyPolicy'));

// ── Relay-only minimal login ──────────────────────────────────────────────────
const RelayLoginScreen = () => {
  const { onLogin, showToast } = useNexus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const res = await onLogin(email, password);
      if (res && !res.success) showToast(res.error || 'Přihlášení selhalo', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh', background: '#000000', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', boxSizing: 'border-box', color: 'white'
    }}>
      <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <img src="/nexus_relay_icon.png" style={{ width: '56px', height: '56px', borderRadius: '14px' }} alt="Nexus Relay" onError={e => { e.target.style.display='none'; }} />
      </div>
      <h2 style={{ fontSize: '1.8rem', fontWeight: '900', letterSpacing: '0.05em', marginBottom: '0.5rem', color: '#60a5fa' }}>NEXUS RELAY</h2>
      <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginBottom: '2.5rem', textAlign: 'center' }}>
        Systémové relé pro Nexus Hub<br/>Zadejte své přihlašovací údaje
      </p>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Mail size={20} style={{ position: 'absolute', left: '1.2rem', color: '#60a5fa', zIndex: 10, pointerEvents: 'none' }} />
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="E-mail"
            autoComplete="username"
            style={{
              width: '100%', padding: '1.2rem 1.2rem 1.2rem 3.5rem', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.08)', border: 'none',
              borderRadius: '16px', color: 'white', fontSize: '1.05rem', outline: 'none', zIndex: 1
            }}
          />
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Lock size={20} style={{ position: 'absolute', left: '1.2rem', color: '#60a5fa', zIndex: 10, pointerEvents: 'none' }} />
          <input
            type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Heslo"
            autoComplete="current-password"
            style={{
              width: '100%', padding: '1.2rem 3.5rem 1.2rem 3.5rem', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.08)', border: 'none',
              borderRadius: '16px', color: 'white', fontSize: '1.05rem', outline: 'none', zIndex: 1
            }}
          />
          <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: '1rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '0.5rem', zIndex: 10, display: 'flex' }}>
            {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <button
          type="submit" disabled={loading || !email || !password}
          style={{
            marginTop: '0.5rem', padding: '1.2rem', borderRadius: '16px', border: 'none',
            background: (loading || !email || !password) ? 'rgba(96, 165, 250, 0.4)' : '#3b82f6',
            color: 'white', fontWeight: '800', fontSize: '1.05rem',
            cursor: (loading || !email || !password) ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', transition: 'all 0.2s'
          }}
        >
          {loading ? <Loader2 size={22} className="animate-spin" /> : <Lock size={20} />}
          {loading ? 'Ověřování...' : 'Spustit Relay'}
        </button>
      </form>
    </div>
  );
};

function AppContent() {
  const nexus = useNexus();
  const {
    isLoggedIn, token, activeTab, setIsSidebarOpen, isSidebarOpen, t, isMobile, showOnboarding,
    showLanding, isDataLoading, hasHydrated, myProfiles: assignedProfiles,
    activeProfileId, setActiveProfileId, isNativeApp, activeOperator, setShowPanicConfirm
  } = nexus;
  const mainRef = React.useRef(null);

  // Scroll to top on tab change
  React.useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  const viewTitles = {
    dashboard: { label: t('dashboard'), icon: LayoutDashboard },
    inbox: { label: t('inbox'), icon: MessageSquare },
    calendar: { label: t('calendar'), icon: Calendar },
    safety: { label: t('security'), icon: Shield },
    profiles: { label: t('profiles'), icon: Users },
    'web-profiles': { label: t('webManagement'), icon: Globe },
    'device-setup': { label: t('deviceSettings'), icon: Smartphone },
    qa: { label: t('qaCenter'), icon: FileSearch },
    hierarchy: { label: t('hierarchy'), icon: Users },
    analytics: { label: t('analytics'), icon: BarChart3 },
    crm: { label: t('crm') || 'CRM', icon: UserCheck },
    activity: { label: t('activity'), icon: Activity },
    developer: { label: 'Developer API', icon: Terminal },
    settings: { label: t('settings'), icon: Settings }
  };

  const isPrivacyPage = typeof window !== 'undefined' && 
    window.location.pathname.replace(/^\/(en|cz)/, '') === '/privacy';

  if (isPrivacyPage) {
    return (
      <Suspense fallback={
        <div style={{ height: '100dvh', background: '#040507', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="nexus-loading-pulse" style={{ width: '64px', height: '64px', background: 'var(--accent-color)', borderRadius: '14px' }} />
        </div>
      }>
        <PrivacyPolicy />
      </Suspense>
    );
  }

  // ── RELAY APP: completely separate flow ─────────────────────────────────────
  const isRelayApp = typeof __APP_VARIANT__ !== 'undefined' && __APP_VARIANT__ === 'relay';

  if (isRelayApp) {
    // If not yet logged in → show relay-specific minimal login
    if (!isLoggedIn) {
      return (
        <>
          <GlobalAppStyles />
          <RelayLoginScreen />
        </>
      );
    }
    // If logged in → show relay UI directly
    return (
      <div className="nexus-shell" style={{ background: '#080a0f', color: '#e2e8f0', height: '100dvh', display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <GlobalAppStyles />
        <Suspense fallback={
          <div style={{ flex: 1, height: '100%', background: '#080a0f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <Loader2 className="animate-spin" size={32} color="var(--accent-color)" />
          </div>
        }>
          <SystemBanners />
          <GlobalModalContainer />
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <RelayModeView />
          </div>
        </Suspense>
      </div>
    );
  }

  // ── STANDARD APP flow below ──────────────────────────────────────────────────

  // 1. Walkthrough / Onboarding
  if (showOnboarding) {
    return (
      <Suspense fallback={<div style={{ height: '100dvh', background: '#040507', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="premium-loading-text">NEXUS_INIT.SYS</div></div>}>
        <Onboarding />
      </Suspense>
    );
  }

  // 2. Auth Gate / Global Loading (Prevents Flashing)
  const isSyncing = isLoggedIn && isDataLoading && !hasHydrated;

  // 2. Navigation Logic
  const isLogoutPage = typeof window !== 'undefined' && 
    window.location.pathname.replace(/^\/(en|cz)/, '') === '/logout';

  if (isLogoutPage) {
    return (
      <Suspense fallback={
        <div style={{ height: '100dvh', background: '#040507', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="nexus-loading-pulse" style={{ width: '64px', height: '64px', background: 'var(--accent-color)', borderRadius: '14px' }} />
        </div>
      }>
        <LogoutScreen />
      </Suspense>
    );
  }

  const shouldShowLanding = showLanding && !isNativeApp;

  if (shouldShowLanding) {
    return (
      <Suspense fallback={
        <div style={{ height: '100dvh', background: '#040507', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="nexus-loading-pulse" style={{ width: '64px', height: '64px', background: 'var(--accent-color)', borderRadius: '14px' }} />
        </div>
      }>
        <LandingPage />
      </Suspense>
    );
  }

  // Handle Unauthenticated State (not showing landing)
  if (!isLoggedIn) {
    return (
      <Suspense fallback={
        <div style={{ height: '100dvh', background: '#040507', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="nexus-loading-pulse" style={{ width: '64px', height: '64px', background: 'var(--accent-color)', borderRadius: '14px' }} />
        </div>
      }>
        <NotificationSystem />
        <LoginScreen />
      </Suspense>
    );
  }

  // #5 bootstrap gate (web): access token žije jen v paměti, takže po reloadu je
  // krátce null, i když je uživatel přihlášený. Než ho useAuth obnoví přes httpOnly
  // refresh cookie, držíme loader — jinak by se autentizovaný UI vykreslil bez tokenu
  // a pálil API volání na 401. Nativ token perzistuje, takže se ho to netýká.
  if (isLoggedIn && !token && !isNativeApp) {
    return (
      <div style={{ height: '100dvh', background: '#040507', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="nexus-loading-pulse" style={{ width: '64px', height: '64px', background: 'var(--accent-color)', borderRadius: '14px' }} />
      </div>
    );
  }

  // Handle Syncing State (logged in but waiting for data)
  if (isSyncing) {
    return (
      <div style={{ 
        height: '100dvh', 
        background: '#040507', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        gap: '2rem'
      }}>
        <div style={{ 
          width: '80px', 
          height: '80px', 
          borderRadius: '20px', 
          overflow: 'hidden', 
          boxShadow: '0 0 50px rgba(59, 130, 246, 0.4)',
          animation: 'nexus-loading-pulse 2s infinite ease-in-out'
        }}>
          <img src="/nexus_icon.png" style={{ width: '100%', height: '100%' }} alt="Nexus" />
        </div>
        <div className="premium-loading-text" style={{ fontSize: '0.65rem', letterSpacing: '0.4em', color: 'var(--accent-color)', fontWeight: '700' }}>
          SYNCING_CORE_STATE...
        </div>
        
        <style>{`
          @keyframes nexus-loading-pulse {
            0% { transform: scale(1); opacity: 1; filter: brightness(1); }
            50% { transform: scale(1.05); opacity: 0.8; filter: brightness(1.3); }
            100% { transform: scale(1); opacity: 1; filter: brightness(1); }
          }
        `}</style>
      </div>
    );
  }

  // 3. Main Application Shell (Authenticated & Hydrated)

  return (
    <div className="nexus-shell" style={{ 
      background: '#080a0f', 
      color: '#e2e8f0', 
      height: '100dvh', 
      display: 'flex', 
      overflow: 'hidden',
      position: 'relative'
    }}>
      <GlobalAppStyles />
      <Suspense fallback={<div style={{ flex: 1, height: '100%', background: '#080a0f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={32} color="var(--accent-color)" />
        <div className="premium-loading-text" style={{ fontSize: '0.6rem', letterSpacing: '0.3em', opacity: 0.5 }}>SYNCHRONIZACE_ROZHRANÍ...</div>
      </div>}>
        <SystemBanners />
        <GlobalModalContainer />
        <UpdateBanner />
        <ErrorBoundary name="Sidebar">
          <Sidebar />
        </ErrorBoundary>
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
          {isMobile && (
            <div className="mobile-top-bar" style={{ 
              flexShrink: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              gap: '0.8rem',
              height: 'calc(64px + env(safe-area-inset-top, 0px))',
              padding: 'env(safe-area-inset-top, 0px) 1.25rem 0',
              background: 'rgba(8, 10, 15, 0.9)',
              backdropFilter: 'blur(15px)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              position: 'fixed',
              top: 0, left: 0, right: 0,
              zIndex: 1000,
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: 0 }}>
                <button 
                  data-testid="sidebar-hamburger"
                  onClick={() => setIsSidebarOpen(true)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}
                >
                  <Menu size={20} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                  {viewTitles[activeTab]?.icon && React.createElement(viewTitles[activeTab].icon, { size: 18, color: 'var(--accent-color)' })}
                  <h2 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {viewTitles[activeTab]?.label || t('dashboard')}
                  </h2>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {activeOperator?.isModel && (
                  <button 
                    onClick={() => setShowPanicConfirm(true)}
                    style={{ 
                      background: 'rgba(239, 68, 68, 0.1)', 
                      border: '1px solid rgba(239, 68, 68, 0.2)', 
                      padding: '0.6rem',
                      borderRadius: '12px',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontWeight: '800',
                      fontSize: '0.75rem',
                      letterSpacing: '0.05em'
                    }}
                  >
                    <Shield size={18} fill="currentColor" fillOpacity={0.2} />
                    <span style={{ display: isMobile ? 'none' : 'block' }}>SOS</span>
                  </button>
                )}

                {['dashboard', 'inbox', 'calendar', 'profiles', 'analytics'].includes(activeTab) && !activeOperator?.isModel && (
                  <div style={{ 
                    width: '140px', 
                    flexShrink: 0,
                    opacity: isSidebarOpen ? 0 : 1, 
                    transition: 'opacity 0.2s',
                    pointerEvents: isSidebarOpen ? 'none' : 'auto'
                  }} className="premium-selector-fix">
                    <PremiumSelector
                      options={assignedProfiles}
                      value={activeProfileId}
                      onChange={(val) => setActiveProfileId(val)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div ref={mainRef} style={{ 
            flex: 1, 
            overflowY: 'auto', 
            overflowX: 'hidden', 
            position: 'relative', 
            paddingTop: isMobile ? '68px' : '0',
            paddingBottom: isMobile ? '80px' : '0', 
            zIndex: 10 
          }} className="custom-scrollbar">
            <ErrorBoundary name="ViewRouter">
              <ViewRouter />
            </ErrorBoundary>
            <ErrorBoundary name="MobileNav">
              {(isNativeApp || isMobile) && <MobileBottomNav />}
            </ErrorBoundary>
          </div>
        </main>
        <ErrorBoundary name="TeamChat">
          <TeamChatFloat />
        </ErrorBoundary>
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary name="RootApp">
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
