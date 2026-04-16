import React from 'react';
import InboxView from '../Views/InboxView';
import CalendarView from '../Views/CalendarView';
import ProfilesView from '../Views/ProfilesView';
import WebProfilesView from '../Views/WebProfilesView';
import DeviceSetupView from '../Views/DeviceSetupView';
import ReferralsView from '../Views/ReferralsView';
import SafetyView from '../Views/SafetyView';
import QAView from '../QAView';
import RelayControlCenter from '../RelayControlCenter';
import RelayModeView from '../Views/RelayModeView';

import { useNexus } from '../../context/NexusContext';

/**
 * Operations Unit: Primary hub for communication and scheduling.
 */
const OperationsUnit = () => {
  const { activeTab, activeRole } = useNexus();

  switch (activeTab) {
    case 'inbox':
      return <InboxView />;
    case 'calendar':
      return <CalendarView />;
    case 'relay':
      // Model sees RelayMode (the relay device UI), others see RelayControlCenter (management)
      return activeRole === 'Model'
        ? <RelayModeView />
        : <RelayControlCenter />;
    case 'profiles':
      return <ProfilesView />;
    case 'web-profiles':
      return <WebProfilesView />;
    case 'device-setup':
      return <DeviceSetupView />;
    case 'qa':
      return <QAView />;
    case 'referrals':
      return <ReferralsView />;
    case 'safety':
      return <SafetyView />;
    default:
      return null;
  }
};

export default OperationsUnit;
