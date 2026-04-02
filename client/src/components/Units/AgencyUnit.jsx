import React from 'react';
import HierarchyView from '../Views/HierarchyView';
import AnalyticsView from '../Views/AnalyticsView';
import ActivityView from '../Views/ActivityView';
import SettingsView from '../Views/SettingsView';

const AgencyUnit = ({
  activeTab,
  isMobile,
  t,
  lang,
  // Common Props
  activeOperator,
  activeRole,
  operators,
  profiles,
  agencies,
  allAgencyProfiles,
  availableOperators,
  activeClient,
  auditLogs,
  // Settings Props
  token,
  API_BASE,
  showToast,
  saveSettings
}) => {
  switch (activeTab) {
    case 'hierarchy':
      return (
        <HierarchyView
          isMobile={isMobile}
          t={t}
          activeRole={activeRole}
          activeOperator={activeOperator}
          operators={operators}
          profiles={profiles}
          agencies={agencies}
        />
      );
    case 'analytics':
      return (
        <AnalyticsView
          isMobile={isMobile}
          t={t}
          agencies={agencies}
          allAgencyProfiles={allAgencyProfiles}
          availableOperators={availableOperators}
        />
      );
    case 'activity':
      return (
        <ActivityView
          isMobile={isMobile}
          t={t}
          activeClient={activeClient}
          auditLogs={auditLogs}
          availableOperators={availableOperators}
        />
      );
    case 'settings':
      return (
        <SettingsView
          isMobile={isMobile}
          t={t}
          lang={lang}
          activeOperator={activeOperator}
          activeRole={activeRole}
          token={token}
          API_BASE={API_BASE}
          showToast={showToast}
          saveSettings={saveSettings}
        />
      );
    default:
      return null;
  }
};

export default AgencyUnit;
