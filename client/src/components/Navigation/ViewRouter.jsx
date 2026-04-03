import React, { lazy, Suspense } from 'react';
import { useNexus } from '../../context/NexusContext';

/**
 * Helper to handle dynamic import failures (e.g. after a new deployment)
 */
const lazyWithRetry = (componentImport) => 
  lazy(async () => {
    const pageHasAlreadyBeenReloaded = JSON.parse(window.sessionStorage.getItem('page-has-been-reloaded') || 'false');
    try {
      return await componentImport();
    } catch (error) {
      if (error instanceof TypeError || error.name === 'ChunkLoadError' || error.message.includes('fetch')) {
        if (!pageHasAlreadyBeenReloaded) {
          window.sessionStorage.setItem('page-has-been-reloaded', 'true');
          console.error('Chunk load failed, reloading local window...', error);
          window.location.reload();
        }
      }
      throw error;
    }
  });

// Views
const DashboardHome = lazyWithRetry(() => import('../DashboardHome'));
const OperationsUnit = lazyWithRetry(() => import('../Units/OperationsUnit'));
const AgencyUnit = lazyWithRetry(() => import('../Units/AgencyUnit'));
const InfrastructureUnit = lazyWithRetry(() => import('../Units/InfrastructureUnit'));

const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', flex: 1, height: '100%', alignItems: 'center', 
    justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-dim)' 
  }}>
    <div className="spinning" style={{ width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }}></div>
  </div>
);

/**
 * Component to handle the main application routing based on activeTab.
 * Uses React.lazy for better performance and smaller initial bundle size.
 */
const ViewRouter = () => {
  const { activeTab } = useNexus();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardHome />;

      // Operations Unit Views
      case 'inbox':
      case 'calendar':
      case 'relay':
      case 'profiles':
      case 'web-profiles':
      case 'device-setup':
      case 'qa':
      case 'referrals':
        return <OperationsUnit />;

      // Agency Unit Views
      case 'hierarchy':
      case 'analytics':
      case 'activity':
      case 'settings':
        return <AgencyUnit />;

      // Infrastructure Unit Views
      case 'agencies':
      case 'infra':
      case 'infrastructure':
      case 'inventory':
      case 'features':
      case 'plans':
      case 'plans-owner':
      case 'permissions':
        return <InfrastructureUnit />;

      default: 
        return <DashboardHome />;
    }
  };

  return (
    <Suspense fallback={<LoadingFallback />}>
      {renderContent()}
    </Suspense>
  );
};

export default ViewRouter;
