import React, { lazy, Suspense } from 'react';
import { useNexus } from '../../context/NexusContext';

// Views
const DashboardHome = lazy(() => import('../DashboardHome'));
const OperationsUnit = lazy(() => import('../Units/OperationsUnit'));
const AgencyUnit = lazy(() => import('../Units/AgencyUnit'));
const InfrastructureUnit = lazy(() => import('../Units/InfrastructureUnit'));

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
      // Operations Unit Views
      case 'dashboard': 
        return <DashboardHome />;
      case 'inbox':
      case 'calendar':
      case 'analytics':
        return <OperationsUnit />;

      // Agency Unit Views
      case 'agencies':
      case 'profiles':
      case 'activity':
      case 'settings':
        return <AgencyUnit />;

      // Infrastructure Unit Views
      case 'inventory':
      case 'infrastructure':
      case 'features':
      case 'plans':
      case 'plans-owner':
      case 'permissions':
      case 'qa':
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
