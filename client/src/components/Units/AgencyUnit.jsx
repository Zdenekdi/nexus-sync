import React from 'react';
import { useNexus } from '../../context/ContextHook';
import HierarchyView from '../Views/HierarchyView';
import AnalyticsView from '../Views/AnalyticsView';
import ActivityView from '../Views/ActivityView';
import SettingsView from '../Views/SettingsView';
import CRMView from '../Views/CRMView';
import InventoryView from '../InventoryView';
import AuditLogsView from '../Views/AuditLogsView';
import PayoutsView from '../Views/PayoutsView';
import SafetyGuardView from '../Views/SafetyGuardView';

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
    case 'inventory':
      return <InventoryView />;
    case 'audit-logs':
      return <AuditLogsView />;
    case 'payouts':
      return <PayoutsView />;
    case 'safety-guard':
      return <SafetyGuardView />;
    default:
      return null;
  }
};

export default AgencyUnit;
