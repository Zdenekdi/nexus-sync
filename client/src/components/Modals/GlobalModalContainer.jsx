import React from 'react';
import { useNexus } from '../../context/NexusContext';

// Modals & Overlays
import BugReportModal from './BugReportModal';
import AgencyDetailModal from './AgencyDetailModal';
import BookingModal from './BookingModal';
import EditProfileModal from './EditProfileModal';
import AddOperatorModal from './AddOperatorModal';
import AddAgencyModal from './AddAgencyModal';
import AddUserModal from './AddUserModal';
import CallOverlays from '../Overlays/CallOverlays';
import NotificationSystem from '../Notifications/NotificationSystem';
import SipManager from '../sip/SipManager';

/**
 * Container for all global modals and overlays.
 * Simplifies App.jsx by grouping all interactive overlays in one place.
 */
const GlobalModalContainer = () => {
  const { 
    isBugReportOpen, setIsBugReportOpen,
    agencyDetailModalData, setAgencyDetailModalData,
    isAddAgencyOpen, setIsAddAgencyOpen,
    isAddUserOpen, setIsAddUserOpen,
    operators, showToast, lang
  } = useNexus();

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
      
      {isAddAgencyOpen && (
        <AddAgencyModal 
          isOpen={isAddAgencyOpen}
          onClose={() => setIsAddAgencyOpen(false)}
        />
      )}

      {isAddUserOpen && (
        <AddUserModal 
          isOpen={isAddUserOpen}
          onClose={() => setIsAddUserOpen(false)}
        />
      )}
      
      {agencyDetailModalData && (
        <AgencyDetailModal 
          agency={agencyDetailModalData}
          onClose={() => setAgencyDetailModalData(null)}
          operators={operators || []}
          showToast={showToast}
          lang={lang}
        />
      )}
    </>
  );
};

export default GlobalModalContainer;
