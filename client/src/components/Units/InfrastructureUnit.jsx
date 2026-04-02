import React from 'react';
import { useNexus } from '../../context/NexusContext';
import AgenciesView from '../Views/AgenciesView';
import GlobalFeaturesView from '../Views/GlobalFeaturesView';
import PermissionsDashboard from '../PermissionsDashboard';
import PlansDashboard from '../PlansDashboard';
import InfraTab from '../InfraTab';

/**
 * Infrastructure Unit: Control hub for system-wide configuration and administration.
 */
const InfrastructureUnit = () => {
  const { activeTab } = useNexus();

  switch (activeTab) {
    case 'agencies':
      return <AgenciesView />;
    case 'infra':
      return <InfraTab />;
    case 'permissions':
      return <PermissionsDashboard />;
    case 'plans':
      return <PlansDashboard />;
    case 'features':
      return <GlobalFeaturesView />;
    default:
      return null;
  }
};

export default InfrastructureUnit;
