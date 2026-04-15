import React from 'react';
import { useNexus } from './context/NexusContext';

// Navigation & Routing
import Sidebar from './components/Navigation/Sidebar';
import MobileBottomNav from './components/Navigation/MobileBottomNav';
import ViewRouter from './components/Navigation/ViewRouter';

// Modals, Overlays & UI
import GlobalModalContainer from './components/Modals/GlobalModalContainer';
import SystemBanners from './components/UI/SystemBanners';
import GlobalAppStyles from './styles/GlobalAppStyles';

// Entry Views
import LandingPage from './components/LandingPage';
import Onboarding from './components/Onboarding';
import LoginScreen from './components/LoginScreen';

/**
 * Nexus Hub Root Content Component
 * Handles the main app structure once context is available.
 */
function AppContent() {
  const {
    isLoggedIn,
    showLanding,
    showOnboarding,
    isSidebarCollapsed,
    isMobile,
    isNativeApp
  } = useNexus();

  // 1. Initial Access Control
  if (!isLoggedIn) {
    // Show product landing page first, then login screen
    if (showLanding) {
      return (
        <div className="nexus-app dark-theme">
          <GlobalAppStyles />
          <LandingPage />
        </div>
      );
    }
    return (
      <div className="nexus-app dark-theme">
        <GlobalAppStyles />
        <LoginScreen />
      </div>
    );
  }

  // 2. Foundation Steps (native onboarding)
  if (showOnboarding && isNativeApp) return <Onboarding />;

  // 3. Core Application Shell
  return (
    <div className={`nexus-app dark-theme ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <GlobalAppStyles />
      
      <div className="nexus-layout">
        {!isMobile && <Sidebar />}
        
        <main className="nexus-main">
          <ViewRouter />
        </main>

        {isMobile && <MobileBottomNav />}
      </div>

      {/* Global Interactive Layers */}
      <GlobalModalContainer />
      <SystemBanners />
    </div>
  );
}

/**
 * Nexus Hub Root Component
 * Handles the Provider wrapper and directs to the main content.
 */
function App() {
  return <AppContent />;
}

export default App;
