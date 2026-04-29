import React, { lazy, Suspense } from 'react';
import { useNexus } from '../../context/ContextHook';

/**
 * Helper to handle dynamic import failures (_err.g. after a new deployment)
 */
const lazyWithRetry = (componentImport) => 
  lazy(async () => {
    const pageHasAlreadyBeenReloaded = JSON.parse(window.sessionStorage.getItem('page-has-been-reloaded') || 'false');
    try {
      return await componentImport();
    } catch (_err) {
      if (_err instanceof TypeError || _err.name === 'ChunkLoadError' || _err.message.includes('fetch')) {
        if (!pageHasAlreadyBeenReloaded) {
          window.sessionStorage.setItem('page-has-been-reloaded', 'true');
          console.error('Chunk load failed, reloading local window...', _err);
          window.location.reload();
        }
      }
      throw _err;
    }
  });

// Views
import DashboardHome from '../DashboardHome';
const OperationsUnit = lazyWithRetry(() => import('../Units/OperationsUnit'));
const AgencyUnit = lazyWithRetry(() => import('../Units/AgencyUnit'));
const InfrastructureUnit = lazyWithRetry(() => import('../Units/InfrastructureUnit'));
const TvDashboard = lazyWithRetry(() => import('../Units/TvDashboard'));
import DocsView from '../Views/DocsView';

const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', flex: 1, height: '100%', alignItems: 'center', 
    justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-dim)' 
  }}>
    <div className="spinning" style={{ width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }}></div>
  </div>
);

const ViewRouter = () => {
  const { activeTab, isTvMode } = useNexus();

  const renderContent = () => {
    if (isTvMode) return <TvDashboard />;

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
      case 'safety':
        return <OperationsUnit />;

      // Agency Unit Views
      case 'hierarchy':
      case 'analytics':
      case 'activity':
      case 'crm':
      case 'inventory':
      case 'audit-logs':
      case 'payouts':
      case 'settings':
      case 'safety-guard':
        return <AgencyUnit />;

      // Infrastructure Unit Views
      case 'agencies':
      case 'infra':
      case 'infrastructure':
      case 'features':
      case 'plans':
      case 'plans-owner':
      case 'permissions':
      case 'maintenance':
        return <InfrastructureUnit />;

      case 'docs':
        return <DocsView />;

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
