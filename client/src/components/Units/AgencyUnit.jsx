import React from 'react';
import { useNexus } from '../../context/NexusContext';
import HierarchyView from '../Views/HierarchyView';
import AnalyticsView from '../Views/AnalyticsView';
import ActivityView from '../Views/ActivityView';
import SettingsView from '../Views/SettingsView';
import CRMView from '../Views/CRMView';

/**
 * Agency Unit: Management hub for agencies and global activity.
 */
const AgencyUnit = () => {
  const { activeTab } = useNexus();

  switch (activeTab) {
    case 'hierarchy':
      return <HierarchyView />;
    case 'analytics':
      return <AnalyticsView />;
    case 'activity':
      return <ActivityView />;
    case 'settings':
      return <SettingsView />;
    case 'crm':
      return <CRMView />;
    default:
      return null;
  }
};

export default AgencyUnit;
