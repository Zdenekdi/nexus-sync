import React from 'react';
import { useNexus } from '../../context/NexusContext';

// Modals & Overlays
import BugReportModal from './BugReportModal';
import AgencyDetailModal from './AgencyDetailModal';
import BookingModal from './BookingModal';
import EditProfileModal from './EditProfileModal';
import AddOperatorModal from './AddOperatorModal';
import AddAgencyModal from './AddAgencyModal';
import CallOverlays from '../Overlays/CallOverlays';
import NotificationSystem from '../Notifications/NotificationSystem';
import SipManager from '../sip/SipManager';

/**
 * Container for all global modals and overlays.
 * Simplifies App.jsx by grouping all interactive overlays in one place.
 */
const GlobalModalContainer = () => {
  const { isBugReportOpen, setIsBugReportOpen } = useNexus();

  return (
    <>
      {/* Global Overlays */}
      <NotificationSystem />
      <CallOverlays />
      <SipManager />

      {/* Global Modals */}
      {isBugReportOpen && (
        <BugReportModal 
          isOpen={isBugReportOpen} 
          onClose={() => setIsBugReportOpen(false)} 
        />
      )}
      <BookingModal />
      <EditProfileModal />
      <AddOperatorModal />
      <AddAgencyModal />
      <AgencyDetailModal />
    </>
  );
};

export default GlobalModalContainer;
