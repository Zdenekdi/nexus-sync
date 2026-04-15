import React from 'react';
import { useNexus } from '../../context/NexusBaseContext';
import HierarchyView from '../Views/HierarchyView';
import AnalyticsView from '../Views/AnalyticsView';
import ActivityView from '../Views/ActivityView';
import SettingsView from '../Views/SettingsView';

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
    default:
      return null;
  }
};

export default AgencyUnit;
