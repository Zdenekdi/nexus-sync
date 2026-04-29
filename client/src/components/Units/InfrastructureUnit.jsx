import React from 'react';
import { useNexus } from '../../context/ContextHook';
import AgenciesView from '../Views/AgenciesView';
import GlobalFeaturesView from '../Views/GlobalFeaturesView';
import PermissionsDashboard from '../PermissionsDashboard';
import PlansDashboard from '../PlansDashboard';
import InfraTab from '../InfraTab';
import MaintenanceView from '../Views/MaintenanceView';
import DocsView from '../Views/DocsView';

/**
 * Infrastructure Unit: Control hub for system-wide configuration and administration.
 */
const InfrastructureUnit = () => {
  const { activeTab } = useNexus();

  switch (activeTab) {
    case 'agencies':
      return <AgenciesView />;
    case 'infra':
    case 'infrastructure':
      return <InfraTab />;
    case 'permissions':
      return <PermissionsDashboard />;
    case 'plans':
    case 'plans-owner':
      return <PlansDashboard />;
    case 'features':
      return <GlobalFeaturesView />;
    case 'maintenance':
      return <MaintenanceView />;
    case 'docs':
      return <DocsView />;
    default:
      return null;
  }
};

export default InfrastructureUnit;
