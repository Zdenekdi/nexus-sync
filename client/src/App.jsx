import React, { Suspense, lazy } from 'react';
import { useNexus } from './context/NexusContext';
import GlobalAppStyles from './styles/GlobalAppStyles';
import ErrorBoundary from './ErrorBoundary';

// Lazy load heavy components
const Sidebar = lazy(() => import('./components/Navigation/Sidebar'));
const MobileBottomNav = lazy(() => import('./components/Navigation/MobileBottomNav'));
const ViewRouter = lazy(() => import('./components/Navigation/ViewRouter'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const Onboarding = lazy(() => import('./components/Onboarding'));
import LoginScreen from './components/LoginScreen';

function AppContent() {
  const { isLoggedIn, token, loading, showLanding, showOnboarding, isNativeApp, activeOperator } = useNexus();

  // Show loading screen ONLY for authenticated users waiting for data hydration
  // This prevents the loading screen from blocking Onboarding/Login for new users or crawlers
  if (isLoggedIn && token && loading) {
    return (
      <div style={{ 
        background: '#080a0f', 
        height: '100dvh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div className="animate-pulse" style={{ color: '#3b82f6', fontSize: '24px', fontWeight: '900', letterSpacing: '0.2em' }}>NEXUS HUB</div>
        <div style={{ color: '#475569', fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em' }}>INITIALIZING SECURE SESSION...</div>
      </div>
    );
  }

  // 1. Walkthrough / Onboarding (4 main functions)
  if (showOnboarding) {
    return (
      <Suspense fallback={null}>
        <Onboarding />
      </Suspense>
    );
  }

  // 2. Landing Page / Marketing (Skip on Native, show only on Web)
  if (showLanding && !isLoggedIn && !isNativeApp) {
    return (
      <Suspense fallback={null}>
        <LandingPage />
      </Suspense>
    );
  }

  // 3. Login Screen
  if (!isLoggedIn) {
    return (
      <Suspense fallback={null}>
        <LoginScreen />
      </Suspense>
    );
  }

  // 4. Main Application Shell (Authenticated)
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
      <Suspense fallback={null}>
        {/* Sidebar for Desktop/Tablet */}
        <ErrorBoundary name="Sidebar">
          <Sidebar />
        </ErrorBoundary>

        {/* Main View Area */}
        <main style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <ErrorBoundary name="ViewRouter">
            <ViewRouter />
          </ErrorBoundary>

          {/* Mobile Bottom Navigation */}
          <ErrorBoundary name="MobileNav">
            <MobileBottomNav />
          </ErrorBoundary>
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
