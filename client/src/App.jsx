import React, { lazy, Suspense } from "react";
import { 
  Loader2, Menu, LayoutDashboard, MessageSquare, Calendar, 
  Shield, Users, Globe, Smartphone, FileSearch, BarChart3, 
  Activity, Settings 
} from 'lucide-react';
import { useNexus } from './context/NexusContext';
import GlobalAppStyles from './styles/GlobalAppStyles';
import PremiumSelector from './components/UI/PremiumSelector';
import ErrorBoundary from './ErrorBoundary';

// Lazy load heavy components
const Sidebar = lazy(() => import('./components/Navigation/Sidebar'));
const MobileBottomNav = lazy(() => import('./components/Navigation/MobileBottomNav'));
const ViewRouter = lazy(() => import('./components/Navigation/ViewRouter'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const Onboarding = lazy(() => import('./components/Onboarding'));
const LoginScreen = lazy(() => import('./components/LoginScreen'));
const SystemBanners = lazy(() => import('./components/UI/SystemBanners'));

function AppContent() {
  const { 
    isLoggedIn, activeTab, setIsSidebarOpen, isSidebarOpen, t, isMobile, showOnboarding, 
    showLanding, isDataLoading, hasHydrated, myProfiles: assignedProfiles, 
    activeProfileId, setActiveProfileId, isNativeApp, activeOperator, setShowPanicConfirm
  } = useNexus();
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
    activity: { label: t('activity'), icon: Activity },
    settings: { label: t('settings'), icon: Settings }
  };

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

  // Handle Unauthenticated State
  if (!isLoggedIn) {
    const shouldShowLanding = showLanding && !isNativeApp;
    return (
      <Suspense fallback={
        <div style={{ height: '100dvh', background: '#040507', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="nexus-loading-pulse" style={{ width: '64px', height: '64px', background: 'var(--accent-color)', borderRadius: '14px' }} />
        </div>
      }>
        {shouldShowLanding ? <LandingPage /> : <LoginScreen />}
      </Suspense>
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
        <div className="premium-loading-text" style={{ fontSize: '0.6rem', letterSpacing: '0.3em', opacity: 0.5 }}>SYNCHRONIZING_INTERFACE...</div>
      </div>}>
        <SystemBanners />
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
            paddingTop: isMobile ? 'calc(64px + env(safe-area-inset-top, 0px))' : '0',
            paddingBottom: isMobile ? '100px' : '0', 
            zIndex: 10 
          }} className="custom-scrollbar">
            <ErrorBoundary name="ViewRouter">
              <ViewRouter />
            </ErrorBoundary>
            <ErrorBoundary name="MobileNav">
              <MobileBottomNav />
            </ErrorBoundary>
          </div>
        </main>
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
