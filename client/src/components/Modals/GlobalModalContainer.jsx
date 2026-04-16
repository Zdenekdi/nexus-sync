import React from 'react';
import axios from 'axios';
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
    operators, showToast, lang, t, isMobile,
    isEditProfileOpen, setIsEditProfileOpen,
    editingProfileData, setEditingProfileData,
    API_BASE, token, setProfiles
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
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        data={editingProfileData}
        onDataChange={setEditingProfileData}
        onSave={async () => {
          if (!editingProfileData) return;
          try {
            const endpoint = `${API_BASE}/profiles/${editingProfileData.id}`;
            await axios.patch(endpoint, {
              name: editingProfileData.name,
              phoneNumber: editingProfileData.phoneNumber
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            // Re-fetch or update local UI optimally
            setProfiles(prev => prev.map(p => p.id === editingProfileData.id ? { ...p, ...editingProfileData } : p));
            showToast(t('profileSavedMsg') || (lang === 'cz' ? 'Profil úspěšně uložen' : 'Profile properly saved'), 'success');
            setIsEditProfileOpen(false);
          } catch (e) {
            console.error('Failed to update profile:', e);
            showToast(lang === 'cz' ? 'Chyba při ukládání profilu' : 'Error saving profile', 'error');
          }
        }}
        t={t}
        lang={lang}
        isMobile={isMobile}
      />
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
