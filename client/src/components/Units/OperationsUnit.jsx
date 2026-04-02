import React from 'react';
import InboxView from '../Views/InboxView';
import CalendarView from '../Views/CalendarView';
import ProfilesView from '../Views/ProfilesView';
import WebProfilesView from '../Views/WebProfilesView';
import DeviceSetupView from '../Views/DeviceSetupView';
import ReferralsView from '../Views/ReferralsView';
import QAView from '../QAView';

import { useNexus } from '../../context/NexusContext';

/**
 * Operations Unit: Primary hub for communication and scheduling.
 */
const OperationsUnit = () => {
  const { activeTab } = useNexus();

  switch (activeTab) {
    case 'inbox':
      return <InboxView />;
    case 'calendar':
      return <CalendarView />;
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
    default:
      return null;
  }
};

export default OperationsUnit;
