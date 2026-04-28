import React from 'react';
import axios from 'axios';
import { useNexus } from '../../context/ContextHook';

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
import PinModal from './PinModal';

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
    operators, showToast, lang, t, isMobile, activeRole, activeOperator,
    isEditProfileOpen, setIsEditProfileOpen,
    editingProfileData, setEditingProfileData,
    isBookingModalOpen, setIsBookingModalOpen,
    newBookingForm, setNewBookingForm,
    handleSaveBooking,
    isPinModalOpen, setIsPinModalOpen, pinModalPromise, setPinModalPromise,
    API_BASE, token, setProfiles, initData
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
      <BookingModal 
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        form={newBookingForm}
        onFormChange={setNewBookingForm}
        onSave={handleSaveBooking}
        lang={lang}
      />
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
              phoneNumber: editingProfileData.phoneNumber,
              commission: editingProfileData.commission
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            // Re-fetch or update local UI optimally
            setProfiles(prev => prev.map(p => p.id === editingProfileData.id ? { ...p, ...editingProfileData } : p));
            showToast(t('profileSavedMsg') || (lang === 'cz' ? 'Profil úspěšně uložen' : 'Profile properly saved'), 'success');
            setIsEditProfileOpen(false);
          } catch (_err) {
            console.error('Failed to update profile:', _err);
            showToast(lang === 'cz' ? 'Chyba při ukládání profilu' : 'Error saving profile', 'error');
          }
        }}
        t={t}
        lang={lang}
        isMobile={isMobile}
      />
      <AddOperatorModal 
        isOpen={false}
        onClose={() => {}}
        t={t}
        lang={lang}
        activeRole={activeRole}
        activeOperator={activeOperator}
      />
      
      {isAddAgencyOpen && (
        <AddAgencyModal 
          isOpen={isAddAgencyOpen}
          onClose={() => setIsAddAgencyOpen(false)}
          t={t}
          token={token}
          onAdd={async (data) => {
            try {
              await axios.post(`${API_BASE}/agency/all`, data, {
                headers: { Authorization: `Bearer ${token}` }
              });
              showToast(lang === 'cz' ? 'Agentura byla vytvořena' : 'Agency provisioned successfully', 'success');
              setIsAddAgencyOpen(false);
              if (initData) initData();
            } catch (_err) {
              console.error(_err);
              showToast(lang === 'cz' ? 'Chyba při vytváření agentury' : 'Failed to provision agency', 'error');
            }
          }}
        />
      )}

      {isAddUserOpen && (
        <AddUserModal 
          isOpen={isAddUserOpen}
          onClose={() => setIsAddUserOpen(false)}
          t={t}
        />
      )}
      
      {agencyDetailModalData && (
        <AgencyDetailModal 
          agency={agencyDetailModalData}
          onClose={() => setAgencyDetailModalData(null)}
          operators={operators || []}
          showToast={showToast}
          lang={lang}
          t={t}
        />
      )}

      {isPinModalOpen && (
        <PinModal 
          onSuccess={() => {
            if (pinModalPromise?.resolve) pinModalPromise.resolve(true);
            setIsPinModalOpen(false);
            setPinModalPromise(null);
          }}
          onCancel={() => {
            if (pinModalPromise?.resolve) pinModalPromise.resolve(false);
            setIsPinModalOpen(false);
            setPinModalPromise(null);
          }}
          title={t('secureVerification') || (lang === 'cz' ? 'Bezpečnostní ověření' : 'Secure Verification')}
          description={t('enterPinToProceed') || (lang === 'cz' ? 'Zadejte svůj PIN pro potvrzení akce.' : 'Enter your PIN to confirm this action.')}
        />
      )}
    </>
  );
};

export default GlobalModalContainer;
