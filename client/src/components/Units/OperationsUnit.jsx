import React from 'react';
import InboxView from '../Views/InboxView';
import CalendarView from '../Views/CalendarView';
import ProfilesView from '../Views/ProfilesView';
import WebProfilesView from '../Views/WebProfilesView';
import DeviceSetupView from '../Views/DeviceSetupView';
import ReferralsView from '../Views/ReferralsView';
import QAView from '../QAView';

const OperationsUnit = ({
  activeTab,
  isMobile,
  t,
  lang,
  token,
  // Common Props
  activeOperator,
  activeRole,
  activeProfileId,
  setActiveProfileId,
  allAgencyProfiles,
  myProfiles,
  profiles,
  setProfiles,
  operators,
  assignedProfiles,
  showToast,
  API_BASE,
  // Inbox Props
  contacts,
  setContacts,
  activeContactId,
  setActiveContactId,
  messages,
  setMessages,
  newMessage,
  setNewMessage,
  handleSendMessage,
  handleRefreshMessages,
  isDrafting,
  setIsDrafting,
  // Calendar Props
  setIsBookingModalOpen,
  handleExportICS,
  isCalendarSyncOpen,
  setIsCalendarSyncOpen,
  calendarSyncUrl,
  setCalendarSyncUrl,
  handleSaveCalendarSync,
  bookingSchedule,
  activeTimerEvent,
  isTimerActive,
  openBookingMenuId,
  setOpenBookingMenuId,
  handleCheckIn,
  handleCheckOut,
  handleEditBooking,
  handleDeleteBooking,
  timeLeft,
  formatSafetyTime,
  isSafetyLoading,
  handleSafetyImOk,
  SAFETY_SUGGESTIONS,
  setSelectedScheduleEvent,
  // Web Profiles Props
  bioText,
  setBioText,
  handleSaveBio,
  isSyncing,
  syncStatus,
  syncProgress,
  handleSyncAll,
  // Device Setup Props
  relayApkInfo,
  setRelayApkInfo,
  // QA Props
  clientNotes,
  clientNames,
  updateClientName,
  // Profiles Props
  assigningProfile,
  setAssigningProfile,
  setActiveTab,
  toggleOperatorStatus,
  handleEditProfile,
  handleSaveAssignees
}) => {
  switch (activeTab) {
    case 'inbox':
      return (
        <InboxView
          isMobile={isMobile}
          t={t}
          contacts={contacts}
          activeContactId={activeContactId}
          setActiveContactId={setActiveContactId}
          messages={messages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          handleSendMessage={handleSendMessage}
          handleRefreshMessages={handleRefreshMessages}
          activeProfileId={activeProfileId}
          setActiveProfileId={setActiveProfileId}
          allAgencyProfiles={allAgencyProfiles}
          myProfiles={myProfiles}
          activeRole={activeRole}
          isDrafting={isDrafting}
          setIsDrafting={setIsDrafting}
          setContacts={setContacts}
          setMessages={setMessages}
        />
      );
    case 'calendar':
      return (
        <CalendarView
          isMobile={isMobile}
          t={t}
          lang={lang}
          activeProfileId={activeProfileId}
          setActiveProfileId={setActiveProfileId}
          allAgencyProfiles={allAgencyProfiles}
          myProfiles={myProfiles}
          activeRole={activeRole}
          setIsBookingModalOpen={setIsBookingModalOpen}
          handleExportICS={handleExportICS}
          isCalendarSyncOpen={isCalendarSyncOpen}
          setIsCalendarSyncOpen={setIsCalendarSyncOpen}
          calendarSyncUrl={calendarSyncUrl}
          setCalendarSyncUrl={setCalendarSyncUrl}
          handleSaveCalendarSync={handleSaveCalendarSync}
          bookingSchedule={bookingSchedule}
          activeTimerEvent={activeTimerEvent}
          isTimerActive={isTimerActive}
          openBookingMenuId={openBookingMenuId}
          setOpenBookingMenuId={setOpenBookingMenuId}
          handleCheckIn={handleCheckIn}
          handleCheckOut={handleCheckOut}
          handleEditBooking={handleEditBooking}
          handleDeleteBooking={handleDeleteBooking}
          timeLeft={timeLeft}
          formatSafetyTime={formatSafetyTime}
          isSafetyLoading={isSafetyLoading}
          handleSafetyImOk={handleSafetyImOk}
          SAFETY_SUGGESTIONS={SAFETY_SUGGESTIONS}
          setSelectedScheduleEvent={setSelectedScheduleEvent}
        />
      );
    case 'profiles':
      return (
        <ProfilesView 
          isMobile={isMobile}
          t={t}
          lang={lang}
          token={token}
          activeRole={activeRole}
          activeOperator={activeOperator}
          allAgencyProfiles={allAgencyProfiles}
          profiles={profiles}
          setProfiles={setProfiles}
          myProfiles={myProfiles}
          operators={operators}
          assigningProfile={assigningProfile}
          setAssigningProfile={setAssigningProfile}
          setActiveProfileId={setActiveProfileId}
          setActiveTab={setActiveTab}
          toggleOperatorStatus={toggleOperatorStatus}
          handleEditProfile={handleEditProfile}
          handleSaveAssignees={handleSaveAssignees}
          showToast={showToast}
          API_BASE={API_BASE}
        />
      );
    case 'web-profiles':
      return (
        <WebProfilesView
          isMobile={isMobile}
          t={t}
          lang={lang}
          activeProfileId={activeProfileId}
          setActiveProfileId={setActiveProfileId}
          assignedProfiles={assignedProfiles}
          activeProfile={profiles.find(p => p.id === activeProfileId)}
          bioText={bioText}
          setBioText={setBioText}
          handleSaveBio={handleSaveBio}
          isSyncing={isSyncing}
          syncStatus={syncStatus}
          syncProgress={syncProgress}
          handleSyncAll={handleSyncAll}
        />
      );
    case 'device-setup':
      return (
        <DeviceSetupView
          isMobile={isMobile}
          t={t}
          relayApkInfo={relayApkInfo}
          setRelayApkInfo={setRelayApkInfo}
          API_BASE={API_BASE}
        />
      );
    case 'qa':
      return (
        <QAView
          t={t}
          messages={messages}
          clientNotes={clientNotes}
          clientNames={clientNames}
          updateClientName={updateClientName}
          activeOperator={activeOperator}
          profiles={profiles}
          operators={operators}
        />
      );
    case 'referrals':
      return (
        <ReferralsView
          isMobile={isMobile}
          t={t}
          lang={lang}
          activeOperator={activeOperator}
        />
      );
    default:
      return null;
  }
};

export default OperationsUnit;
