import { useState, useCallback } from 'react';
import axios from 'axios';

/**
 * Hook to manage transient UI state and minor logic.
 */
export function useUILogic({ token, API_BASE, showToast, lang }) {
  // Mobile Navigation
  const [mobileView, setMobileView] = useState('sidebar'); // 'sidebar', 'list', 'chat', 'details'
  
  // Tab/Panel Persistence for Inbox/Dashboard
  const [activeContextTab, setActiveContextTab] = useState('note');
  const [inlinePanelTab, setInlinePanelTab] = useState(null);
  
  // Specific UI actions (Moved from App.jsx)
  const [assigningProfile, setAssigningProfile] = useState(null);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  
  // Calendar View State
  const [calViewDate, setCalViewDate] = useState(new Date());
  
  // Translation Logic
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [targetLang, setTargetLang] = useState('en');

  // Call Logic (Moved from App.jsx)
  const [activeCall, setActiveCall] = useState(null);
  const [callTime, setCallTime] = useState(0);

  // Sync/Training Logic (Moved from App.jsx)
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState({ aw: 'idle', ege: 'idle', tpb: 'idle' });
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  
  // Settings Logic
  const [departureIntervalMin, setDepartureIntervalMin] = useState(() => {
    const saved = localStorage.getItem('nexus_departure_interval');
    return saved ? parseInt(saved, 10) : 15;
  });

  const handleTranslate = useCallback(async () => {
    if (!sourceText.trim() || !token) return;
    try {
      setIsTranslating(true);
      const res = await axios.post(`${API_BASE}/ai/translate`, {
        text: sourceText,
        targetLang: lang === 'cz' ? 'en' : 'cs' // Simple toggle for now
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTranslatedText(res.data.translatedText);
    } catch (err) {
      console.error('Translation error:', err);
      showToast('Translation failed', 'error');
    } finally {
      setIsTranslating(false);
    }
  }, [sourceText, token, API_BASE, lang, showToast]);

  const startCall = useCallback((profile, chat) => {
    if (!profile) return;
    setActiveCall({ status: 'connecting', startTime: Date.now(), caller: chat?.from || profile?.name || 'Unknown' });
    setTimeout(() => {
      setActiveCall({ status: 'active', startTime: Date.now(), caller: chat?.from || profile?.name || 'Unknown' });
    }, 2000);
  }, []);

  const acceptCall = useCallback((incomingCall) => {
    if (!incomingCall) return;
    const caller = incomingCall.caller;
    setActiveCall({ status: 'active', startTime: Date.now(), caller });
  }, []);

  const endCall = useCallback(() => setActiveCall(null), []);
  const formatCallTime = useCallback((s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`, []);

  const handleSyncAll = useCallback(() => {
    setIsSyncing(true);
    setSyncStatus({ aw: 'syncing', ege: 'syncing', tpb: 'syncing' });
    setSyncProgress(0);
    const interval = setInterval(() => {
      setSyncProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setIsSyncing(false);
          setSyncStatus({ aw: 'done', ege: 'done', tpb: 'done' });
          showToast('Infrastructure synced successfully', 'success');
          return 100;
        }
        return p + 10;
      });
    }, 300);
  }, [showToast]);

  const handleStopSync = useCallback(() => {
    setIsSyncing(false);
    setSyncStatus({ aw: 'idle', ege: 'idle', tpb: 'idle' });
  }, []);

  const handleStartTraining = useCallback(() => {
    setIsTraining(true);
    setTrainingProgress(0);
    const interval = setInterval(() => {
      setTrainingProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setIsTraining(false);
          showToast('AI model trained with new data', 'success');
          return 100;
        }
        return p + 5;
      });
    }, 200);
  }, [showToast]);

  const handleResetTraining = useCallback(() => {
    setTrainingProgress(0);
    setIsTraining(false);
  }, []);


  return {
    mobileView, setMobileView,
    activeContextTab, setActiveContextTab,
    inlinePanelTab, setInlinePanelTab,
    calViewDate, setCalViewDate,
    sourceText, setSourceText,
    translatedText, setTranslatedText,
    isTranslating, setIsTranslating,
    targetLang, setTargetLang,
    assigningProfile, setAssigningProfile,
    isBugReportOpen, setIsBugReportOpen,
    activeCall, setActiveCall,
    callTime, setCallTime,
    isSyncing, setIsSyncing,
    syncProgress, setSyncProgress,
    syncStatus, setSyncStatus,
    isTraining, setIsTraining,
    trainingProgress, setTrainingProgress,
    departureIntervalMin, setDepartureIntervalMin,
    handleTranslate,
    startCall,
    acceptCall,
    endCall,
    formatCallTime,
    handleSyncAll,
    handleStopSync,
    onStartTraining: handleStartTraining,
    onResetTraining: handleResetTraining
  };
}
