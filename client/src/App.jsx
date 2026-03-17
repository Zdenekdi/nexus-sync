import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield, Laptop, Smartphone, Globe, Activity, Building2, MapPin,
  Search, Send, MessageCircle, Clock, Check, MoreVertical,
  AlertCircle, ChevronRight, User, Settings, LogOut, Layout,
  Calendar, Inbox, MessageSquare, Briefcase, Hash, DollarSign,
  TrendingUp, Users, UserPlus, UserCheck, ShieldCheck, CreditCard,
  Zap, Building, LayoutDashboard, Database,
    Phone, Server, Cpu, FileEdit, CheckCheck, FileSearch, Trash2,
    Eye, Save, X, RotateCcw, Lock, Share2, Filter, Menu, UserCircle, Plus, Info, ChevronDown, ChevronUp, ChevronLeft,
    BarChart2 as BarChart3, Shield as ShieldAlert, HardDrive, Gift, Trophy, RefreshCw, Bug, Copy, Signal, Mic, MicOff, Sparkles,
    StickyNote, AlertTriangle, Image, Link, Star, CheckCircle, Languages, Package
  } from 'lucide-react';
import { MOCK_OPERATORS, MOCK_CLIENTS, MOCK_AGENCIES, MOCK_PROFILES, MOCK_MESSAGES, MOCK_STATS, MOCK_CALENDAR, MOCK_SESSIONS, MOCK_AUDIT_LOG, MOCK_CHART_DATA, MOCK_SMART_REPLIES, MOCK_PLANS, MOCK_REFERRALS, MOCK_PERMISSIONS } from './DemoData';
import { TRANSLATIONS } from './translations';
import { useSocket } from './hooks/useSocket';
import QAView from './components/QAView';
import PermissionsDashboard from './components/PermissionsDashboard';
import PlansDashboard from './components/PlansDashboard';
import DashboardHome from './components/DashboardHome';
import LoginScreen from './components/LoginScreen';
import ResetPasswordView from './components/ResetPasswordView';
import InventoryView from './components/InventoryView';



function App() {
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [tempUser, setTempUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('nexus_isLoggedIn') === 'true';
  });
  const [activeOperator, setActiveOperator] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_activeOperator');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (parsed) return parsed;
      }
      return MOCK_OPERATORS[0] || {};
    } catch { return MOCK_OPERATORS[0] || {}; }
  });
  const [activeClient, setActiveClient] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_activeClient');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (parsed) return parsed;
      }
      return MOCK_CLIENTS[0];
    } catch { return MOCK_CLIENTS[0]; }
  });

  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [profiles, setProfiles] = useState(MOCK_PROFILES);
  const [agencies, setAgencies] = useState(MOCK_AGENCIES);
  const [operators, setOperators] = useState(MOCK_OPERATORS);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeProfileId, setActiveProfileId] = useState(MOCK_PROFILES[0]?.id);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [lang, setLang] = useState('en');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileView, setMobileView] = useState('sidebar');

  const t = (key, data = {}) => {
    try {
      let str = (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || key || '';
      Object.keys(data).forEach(k => {
        str = str.replace(`{${k}}`, data[k]);
      });
      return str;
    } catch {
      return key || '';
    }
  };

  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callTime, setCallTime] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState({ aw: 'idle', ege: 'idle', tpb: 'idle' });
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingDetails, setBookingDetails] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '14:00',
    duration: '60',
    type: 'work'
  });
  const [bookingSchedule, setBookingSchedule] = useState(MOCK_CALENDAR.events);
  const [bookingCollision, setBookingCollision] = useState(null);
  const [internalNote, setInternalNote] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('nexus_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('nexus_sidebar_collapsed', isSidebarCollapsed);
  }, [isSidebarCollapsed]);

  const [clientNotes, setClientNotes] = useState(() => {
    const saved = localStorage.getItem('nexus_client_notes');
    return saved ? JSON.parse(saved) : {};
  });

  const [clientNames, setClientNames] = useState(() => {
    const saved = localStorage.getItem('nexus_client_names');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('nexus_client_names', JSON.stringify(clientNames));
  }, [clientNames]);

  const updateClientName = useCallback((phoneNumber, name) => {
    setClientNames(prev => ({
      ...prev,
      [phoneNumber]: name
    }));
  }, []);
  const [activeContextTab, setActiveContextTab] = useState('note');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [targetLang, setTargetLang] = useState('en');
  const [messageValue, setMessageValue] = useState('');
  const [sessionHistories] = useState({});
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [showOnlyOnline, setShowOnlyOnline] = useState(false);

  // Agency Management States
  const [isAddAgencyModalOpen, setIsAddAgencyModalOpen] = useState(false);
  const [newAgencyData, setNewAgencyData] = useState({ name: '', region: 'UK/Europe', tier: 'Professional' });
  const [isAddOperatorModalOpen, setIsAddOperatorModalOpen] = useState(false);
  const [targetAgencyId, setTargetAgencyId] = useState(null);
  const [newOperatorData, setNewOperatorData] = useState({ name: '', role: 'Operator', email: '', password: 'password123' });
  const [rolePermissions, setRolePermissions] = useState(MOCK_PERMISSIONS);
  const [activeMarket, setActiveMarket] = useState('EU');
  const [subscriptionPlans] = useState(MOCK_PLANS);
  const [smartReplies] = useState(MOCK_SMART_REPLIES);
  const [stats] = useState(MOCK_STATS);
  const [auditLogs] = useState(MOCK_AUDIT_LOG);
  const [sessions] = useState(MOCK_SESSIONS);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editingProfileData, setEditingProfileData] = useState(null);



  // Handle Window Resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle Call Timer
  useEffect(() => {
    let interval;
    if (activeCall) {
      interval = setInterval(() => setCallTime(prev => prev + 1), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
      setCallTime(0);
    };
  }, [activeCall]);

  // Handle Routing & Auth persistence (Clean URLs)
  useEffect(() => {
    const handlePathChange = () => {
      const path = window.location.pathname.replace(/^\//, '') || 'dashboard';
      if (isLoggedIn) {
        if (path === 'login' || path === '') {
          window.history.replaceState(null, '', '/dashboard');
          setActiveTab('dashboard');
        } else {
          setActiveTab(path);
        }
      } else {
        if (path !== 'login') {
          window.history.replaceState(null, '', '/login');
        }
      }
    };

    window.addEventListener('popstate', handlePathChange);
    handlePathChange(); // Initial check
    return () => window.removeEventListener('popstate', handlePathChange);
  }, [isLoggedIn]);

  // Update URL pathname when activeTab changes
  useEffect(() => {
    if (isLoggedIn && activeTab) {
      if (window.location.pathname !== `/${activeTab}`) {
        window.history.pushState(null, '', `/${activeTab}`);
      }
    }
  }, [activeTab, isLoggedIn]);

  // Initialize Socket Connection
  useSocket(
    useCallback((newMsg) => setMessages(prev => [...prev, newMsg]), []),
    useCallback((updatedMsg) => setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m)), [])
  );

  const addAgency = useCallback(() => {
    if (!newAgencyData.name) return;
    const newAgency = {
      id: `agency-${Date.now()}`,
      name: newAgencyData.name,
      region: newAgencyData.region,
      tier: newAgencyData.tier,
      status: 'active',
      subscription: {
        plan: newAgencyData.tier,
        status: 'active',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      features: {
        ai_relay: true,
        analytics: true,
        enterprise_proxies: newAgencyData.tier === 'Enterprise',
        multiUser: true,
        customReports: newAgencyData.tier === 'Enterprise'
      }
    };
    setAgencies(prev => [...prev, newAgency]);
    setIsAddAgencyModalOpen(false);
    setNewAgencyData({ name: '', region: 'UK/Europe', tier: 'Professional' });
  }, [newAgencyData]);

  const deleteAgency = (id) => {
    if (window.confirm('Are you sure you want to PERMANENTLY delete this agency and all its team members? This action cannot be undone.')) {
      setAgencies(prev => prev.filter(a => a.id !== id));
      setOperators(prev => prev.filter(o => o.clientId !== id));
      setProfiles(prev => prev.filter(p => p.clientId !== id));
    }
  };

  const addOperator = useCallback(() => {
    if (!newOperatorData.name || !newOperatorData.email || !targetAgencyId) return;
    
    // Auto-generate password if not manually provided
    const autoPassword = `Nexus_${Math.floor(1000 + Math.random() * 9000)}`;
    const finalPassword = (newOperatorData.password && newOperatorData.password !== 'password123') ? newOperatorData.password : autoPassword;

    const newOp = {
      id: `op-${Date.now()}`,
      name: newOperatorData.name,
      role: newOperatorData.role,
      clientId: targetAgencyId,
      avatar: newOperatorData.name.split(' ').map(n => n[0]).join('').toUpperCase(),
      email: newOperatorData.email,
      password: finalPassword,
      mustResetPassword: true,
      metrics: { messages: 0, calls: 0, conversion: '0%' },
      permissions: { qa: true, referrals: false }
    };
    setOperators(prev => [...prev, newOp]);
    setIsAddOperatorModalOpen(false);
    
    // Simulate Email Notification
    const emailPayload = `Subject: Welcome to Nexus Sync! \n\nHello ${newOp.name},\nYour account has been created. \nTemporary Password: ${finalPassword}\nPlease log in to change your password.`;
    console.log("%c [EMAIL SIMULATION] Sending registration email...", "color: #3b82f6; font-weight: bold;", emailPayload);
    alert(`${t('emailSentNotification')} ${newOp.email}\n\nTemp Password: ${finalPassword}`);

    setNewOperatorData({ name: '', role: 'Operator', email: '', password: 'password123' });
  }, [newOperatorData, targetAgencyId, t]);

  const deleteOperator = (id) => {
    if (window.confirm('Remove this team member?')) {
      setOperators(prev => prev.filter(o => o.id !== id));
    }
  };


  // Memoized Derived Data
  const availableOperators = useMemo(() =>
    activeOperator?.isSuperAdmin ? operators : operators.filter(op => op.clientId === activeOperator?.clientId),
    [activeOperator?.clientId, activeOperator?.isSuperAdmin, operators]
  );

  const myProfiles = useMemo(() =>
    profiles.filter(p => p.operators.some(op => op.id === activeOperator?.id && op.active)),
    [profiles, activeOperator?.id]
  );

  const myProfileIds = useMemo(() => myProfiles.map(p => p.id), [myProfiles]);

  const allAgencyProfiles = useMemo(() =>
    activeOperator?.isSuperAdmin ? profiles : profiles.filter(p => p.clientId === activeOperator?.clientId),
    [profiles, activeOperator?.clientId, activeOperator?.isSuperAdmin]
  );

  const activeProfile = useMemo(() =>
    profiles.find(p => p.id === activeProfileId) || allAgencyProfiles[0],
    [profiles, activeProfileId, allAgencyProfiles]
  );

  const filteredMessages = useMemo(() => {
    let base = messages.filter(m => m.profileId === activeProfileId);
    return base.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [messages, activeProfileId]);

  const selectedChat = useMemo(() =>
    selectedChatId ? filteredMessages.find(m => m.id === selectedChatId) : (filteredMessages[0] || null),
    [filteredMessages, selectedChatId]
  );

  const currentAgency = useMemo(() => agencies.find(a => a.id === activeClient?.id) || agencies[0], [activeClient, agencies]);

  const toggleOperatorStatus = (profileId, operatorId) => {
    setProfiles(prev => prev.map(p => {
      if (p.id === profileId) {
        return {
          ...p,
          operators: p.operators.map(op => 
            op.id === operatorId ? { ...op, active: !op.active } : op
          )
        };
      }
      return p;
    }));
  };

  const handleEditProfile = (profile) => {
    setEditingProfileData({ ...profile });
    setIsEditProfileModalOpen(true);
  };

  const handleSaveProfile = useCallback(() => {
    if (!editingProfileData) return;
    setProfiles(prev => prev.map(p => 
      p.id === editingProfileData.id ? { ...p, ...editingProfileData } : p
    ));
    setIsEditProfileModalOpen(false);
    setEditingProfileData(null);
  }, [editingProfileData]);

  const handleSaveNote = useCallback(() => {
    if (!internalNote.trim() || !selectedChat?.from) return;
    setClientNotes(prev => ({
      ...prev,
      [selectedChat.from]: [
        ...(prev[selectedChat.from] || []),
        { id: Date.now(), text: internalNote, author: activeOperator?.name || 'Operator', timestamp: new Date().toLocaleString() }
      ]
    }));
    setInternalNote('');
  }, [internalNote, selectedChat, activeOperator]);

  const totalUnread = useMemo(() =>
    messages?.filter(msg =>
      msg && (activeOperator?.isModel ? msg.profileId === 'p-04' : myProfileIds.includes(msg.profileId)) &&
      msg.status === 'unread'
    ).length || 0,
    [messages, myProfileIds, activeOperator]
  );

  const getUnreadForProfile = (profileId) => {
    return messages.filter(msg => msg.profileId === profileId && msg.status === 'unread').length;
  };

  const startCall = useCallback(() => {
    if (!activeProfile) return;
    setActiveCall({ status: 'connecting', startTime: Date.now(), caller: selectedChat?.from || activeProfile?.name || 'Unknown' });
    setTimeout(() => {
      setActiveCall({ status: 'active', startTime: Date.now(), caller: selectedChat?.from || activeProfile?.name || 'Unknown' });
    }, 2000);
  }, [activeProfile, selectedChat]);

  const simulateIncomingCall = useCallback(() => {
    const randomProfile = myProfiles[Math.floor(Math.random() * myProfiles.length)] || profiles[0];
    setIncomingCall({
      profileId: randomProfile.id,
      profileName: randomProfile.name,
      caller: '+44 7700 900' + Math.floor(100 + Math.random() * 900)
    });
  }, [myProfiles, profiles]);

  const acceptCall = useCallback(() => {
    const caller = incomingCall.caller;
    setIncomingCall(null);
    setActiveCall({ status: 'active', startTime: Date.now(), caller });
  }, [incomingCall]);

  const endCall = useCallback(() => setActiveCall(null), []);
  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const handleSyncAll = useCallback(() => {
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncStatus({ aw: 'syncing', ege: 'syncing', tpb: 'syncing' });
    let p = 0;
    const interval = setInterval(() => {
      p += 5;
      setSyncProgress(p);
      if (p === 40) setSyncStatus(s => ({ ...s, aw: 'synced' }));
      if (p === 75) setSyncStatus(s => ({ ...s, tpb: 'synced' }));
      if (p >= 100) {
        clearInterval(interval);
        setIsSyncing(false);
        setSyncStatus({ aw: 'synced', ege: 'synced', tpb: 'synced' });
      }
    }, 150);
  }, []);

  const handleTranslate = useCallback(() => {
    if (!sourceText.trim()) return;
    setIsTranslating(true);
    setTimeout(() => {
      setTranslatedText(`[${t('poweredByAi')}]: ${sourceText}`);
      setIsTranslating(false);
    }, 1200);
  }, [sourceText, t]);

  const handleConfirmBooking = useCallback(() => {
    const newEvent = {
        time: `${bookingDetails.time} ${parseInt(bookingDetails.time) >= 12 ? 'PM' : 'AM'}`,
        duration: `${parseInt(bookingDetails.duration) / 60}h`,
        title: `Private Booking - ${selectedChat?.from || 'Client'}`,
        status: 'busy',
        type: bookingDetails.type
    };
    setBookingSchedule(prev => [...prev, newEvent]);
    setIsBookingModalOpen(false);
  }, [bookingDetails, selectedChat, bookingSchedule]);

  const handleLogin = useCallback((user) => {
    const client = MOCK_CLIENTS.find(c => c.id === user.clientId) || null;
    setActiveOperator(user);
    setActiveClient(client);
    setIsLoggedIn(true);
    
    localStorage.setItem('nexus_isLoggedIn', 'true');
    localStorage.setItem('nexus_activeOperator', JSON.stringify(user));
    if (client) {
      localStorage.setItem('nexus_activeClient', JSON.stringify(client));
    }

    setActiveTab('dashboard');
  }, []);

  const handleResetRequired = useCallback((user) => {
    setTempUser(user);
    setShowResetPassword(true);
  }, []);

  const handleResetComplete = useCallback((newPassword) => {
    if (!tempUser) return;
    
    // Update operators state with new password and clear flag
    const updatedOperators = operators.map(op => 
      op.id === tempUser.id ? { ...op, password: newPassword, mustResetPassword: false } : op
    );
    setOperators(updatedOperators);
    
    // Auto login after reset
    const updatedUser = updatedOperators.find(op => op.id === tempUser.id);
    handleLogin(updatedUser);
    
    setShowResetPassword(false);
    setTempUser(null);
  }, [tempUser, operators, handleLogin]);

  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
    setActiveProfileId(null);
    setSelectedChatId(null);
    localStorage.removeItem('nexus_isLoggedIn');
    localStorage.removeItem('nexus_activeOperator');
    localStorage.removeItem('nexus_activeClient');
  }, []);

  // Main UI logic
  const renderContent = () => {
    if (!isLoggedIn) {
      if (showResetPassword) {
        return <ResetPasswordView onComplete={handleResetComplete} t={t} />;
      }
      return (
        <LoginScreen 
          onLogin={handleLogin} 
          onResetRequired={handleResetRequired}
          operators={operators}
          lang={lang} 
          setLang={setLang} 
          t={t} 
        />
      );
    }
    
    // Authenticated UI
    return (
      <div className="mobile-container" style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg-color)', color: 'white', position: 'relative' }}>
        {/* ... child content remains here, we just moved the return into this function ... */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media (max-width: 768px) {
            .desktop-sidebar {
              position: fixed !important;
              left: 0;
              top: 0;
              height: 100vh;
              width: 280px;
              z-index: 9500 !important;
              transform: translateX(-100%);
              transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              background: rgba(5, 7, 10, 0.98) !important;
              backdrop-filter: blur(25px) !important;
              box-shadow: 15px 0 50px rgba(0,0,0,0.8);
            }
          .desktop-sidebar.open {
            transform: translateX(0);
          }
          .main-content {
            margin-left: 0 !important;
            padding-top: 60px !important;
            height: auto !important;
            min-height: calc(100vh - 60px);
            overflow-y: visible !important;
          }
          body, html, #root {
            overflow-x: hidden !important;
            height: auto !important;
            min-height: 100%;
          }
          .mobile-container {
            height: auto !important;
            min-height: 100vh;
            overflow-y: auto !important;
            overflow-x: hidden !important;
          }
          .mobile-header {
            display: flex !important;
          }
          .hide-on-mobile {
            display: none !important;
          }
          /* Stack columns in Inbox */
          .inbox-grid {
            grid-template-columns: 1fr !important;
          }
          .inbox-panel {
            display: none;
          }
          .inbox-panel.active {
            display: flex;
            position: fixed;
            inset: 0;
            z-index: 100;
            background: var(--bg-color);
          }
          .demo-controls {
             bottom: 1rem !important;
             padding: 0.5rem 1rem !important;
             gap: 0.5rem !important;
             width: 90% !important;
             overflow-x: auto;
          }
          .demo-controls-label {
            display: none !important;
          }
        }
      ` }} />

      {/* Mobile Top Bar */}
      <div className="mobile-header" style={{ 
        display: 'none', 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        height: '60px', 
        background: 'rgba(5,7,10,0.95)', 
        backdropFilter: 'blur(20px)', 
        borderBottom: '1px solid var(--card-border)', 
        zIndex: 9000,
        alignItems: 'center',
        padding: '0 1.5rem',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Zap color="var(--accent-color)" size={20} />
          <span style={{ fontWeight: '900', fontSize: '1.1rem' }}>NEXUS</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Overlay for mobile sidebar */}
      {isMobile && isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9499 }}
        />
      )}


      {/* Sidebar */}
      <nav className={`desktop-sidebar ${isMobileMenuOpen ? 'open' : ''}`} style={{
        width: '280px',
        flexShrink: 0,
        borderRight: '1px solid var(--card-border)',
        padding: '2rem 1.5rem',
        background: 'rgba(5, 7, 10, 0.4)',
        backdropFilter: 'blur(30px)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 10,
        overflow: 'hidden'
      }}>
        <div style={{ marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div 
              onClick={() => setActiveTab('dashboard')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'opacity 0.2s' }}
              onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
              onMouseOut={e => e.currentTarget.style.opacity = '1'}
            >
              <div style={{ width: '42px', height: '42px', background: 'var(--accent-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px var(--accent-glow)', flexShrink: 0 }}>
                <Zap color="white" fill="white" size={22} />
              </div>
              <span style={{ fontSize: '1.4rem', fontWeight: '900', letterSpacing: '0.05em' }}>{t('logo')}</span>
            </div>
            {!isMobile && (
              <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title={isSidebarCollapsed ? "Show All Navigation" : "Collapse Navigation"}
              >
                {isSidebarCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
            <button onClick={() => setLang('cz')} style={{ flex: 1, padding: '4px 8px', border: 'none', background: lang === 'cz' ? 'var(--accent-color)' : 'transparent', color: 'white', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer' }}>CZ</button>
            <button onClick={() => setLang('en')} style={{ flex: 1, padding: '4px 8px', border: 'none', background: lang === 'en' ? 'var(--accent-color)' : 'transparent', color: 'white', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer' }}>EN</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem', marginRight: '-0.5rem', paddingRight: '0.5rem' }} className="custom-scrollbar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {[
                { id: 'infra', icon: HardDrive, label: t('infra'), perm: 'infrastructure' },
                { id: 'agencies', icon: Building2, label: t('agencies'), perm: 'agencies' },
                { id: 'permissions', icon: Shield, label: t('permissions'), perm: 'permissions' },
                { id: 'plans', icon: CreditCard, label: t('plans'), perm: 'plans' },
                { id: 'features', icon: Zap, label: t('featuresCap'), perm: 'global_features' },
                { id: 'hierarchy', icon: Users, label: t('hierarchy'), perm: 'hierarchy' },
                { id: 'analytics', icon: BarChart3, label: t('analytics'), perm: 'analytics' },
                { id: 'inbox', icon: MessageSquare, label: t('messages'), badge: activeOperator?.isModel ? 0 : totalUnread, perm: 'messaging' },
                { id: 'calendar', icon: Calendar, label: t('schedule'), perm: 'calendar' },
                { id: 'profiles', icon: Users, label: t('profiles'), perm: 'profiles' },
                { id: 'web-profiles', icon: Globe, label: t('webProfiles'), perm: 'web_profiles' },
                { id: 'device-setup', icon: Smartphone, label: t('deviceSetup'), perm: 'device_setup' },
                { id: 'activity', icon: Activity, label: t('auditLog'), perm: 'audit_logs' },
                { id: 'referrals', icon: Gift, label: t('referrals'), perm: 'referrals' },
                { id: 'inventory', icon: Package, label: t('inventory'), perm: 'inventory' },
                { id: 'qa', icon: FileSearch, label: t('qa'), perm: 'qa_hub' },
                { id: 'settings', icon: Settings, label: t('settings'), perm: 'settings' },
            ].filter(item => {
              if (isSidebarCollapsed && !isMobile) {
                // Persistent core items
                return item.id === 'inbox' || item.id === 'calendar';
              }
              // Role-based permission check
              const operatorRole = activeOperator?.role || 'Operator';
              const perms = rolePermissions[operatorRole] || {};
              return perms[item.perm];
            })
.map(item => (
            <button key={item.id} 
              onClick={() => {
                setActiveTab(item.id);
                if (isMobile) setIsMobileMenuOpen(false);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1rem', border: 'none', borderRadius: '12px',
                background: activeTab === item.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              {(() => {
                const Icon = item.icon || Search;
                return <Icon size={20} color={activeTab === item.id ? 'var(--accent-color)' : 'var(--text-secondary)'} style={{ flexShrink: 0 }} />;
              })()}
              <span style={{ color: activeTab === item.id ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === item.id ? '700' : '500', fontSize: '1rem', whiteSpace: 'nowrap' }}>
                {item.label || item.id}
              </span>
              {item.badge > 0 && <div className="unread-badge">{item.badge}</div>}
            </button>
          ))}
          </div>

          {/* Profile Switcher - Only hidden if operator is a Model or Super/Global Admin */}
          {!activeOperator?.isModel && !activeOperator?.isSuperAdmin && !activeOperator?.isAdmin && (
          <div style={{ marginTop: '2.5rem', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>{t('myAssignedGirls')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: showOnlyOnline ? 'var(--success-color)' : 'var(--text-secondary)', transition: 'color 0.2s' }}>{t('online').toUpperCase()}</span>
                <div 
                  onClick={() => setShowOnlyOnline(!showOnlyOnline)}
                  className={`toggle-switch ${showOnlyOnline ? 'active' : ''}`}
                  style={{ 
                    width: '40px', 
                    height: '20px', 
                    background: showOnlyOnline ? 'var(--success-color)' : 'rgba(255,255,255,0.1)',
                    borderRadius: '20px',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: '1px solid ' + (showOnlyOnline ? 'var(--success-color)' : 'var(--card-border)')
                  }}
                >
                  <div style={{ 
                    width: '14px', 
                    height: '14px', 
                    background: 'white', 
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: showOnlyOnline ? '22px' : '3px',
                    transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}></div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '40vh', overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
              {myProfiles.filter(p => !showOnlyOnline || p.status === 'online').map(p => {
                const unread = getUnreadForProfile(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActiveProfileId(p.id);
                      setActiveTab('inbox');
                      setSelectedChatId(null);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', border: '1px solid',
                      borderRadius: '10px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                      background: activeProfile?.id === p.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                      borderColor: activeProfile?.id === p.id ? 'var(--accent-color)' : 'transparent',
                      position: 'relative'
                    }}
                  >
                    <div style={{ width: '8px', height: '8px', background: p.status === 'online' ? 'var(--success-color)' : 'var(--text-secondary)', borderRadius: '50%' }}></div>
                    <span style={{ fontSize: '0.85rem', fontWeight: activeProfile?.id === p.id ? '700' : '500', color: activeProfile?.id === p.id ? 'white' : 'var(--text-secondary)' }}>{p.name}</span>
                    {unread > 0 && <div style={{ marginLeft: 'auto', background: 'var(--error-color)', color: 'white', fontSize: '0.6rem', padding: '1px 5px', borderRadius: '4px', fontWeight: '900' }}>{unread}</div>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="glass-card" style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.02)', borderColor: 'var(--card-border)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '36px', height: '36px', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: 'var(--accent-color)', fontSize: '0.7rem' }}>{activeOperator?.avatar}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeOperator?.name}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{activeOperator?.role}</div>
              </div>
              <div style={{ width: '6px', height: '6px', background: 'var(--success-color)', borderRadius: '50%' }}></div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              padding: '0.75rem 1rem', 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.2)', 
              borderRadius: '12px', 
              color: 'var(--error-color)', 
              fontSize: '0.8rem', 
              fontWeight: '700', 
              cursor: 'pointer', 
              transition: 'all 0.2s',
              justifyContent: 'center'
            }}
          >
            <LogOut size={16} /> {t('logout')}
          </button>
        </div>
      </nav>

      {/* Main Area */}
      <main className="main-content" style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        height: isMobile ? 'auto' : '100vh', 
        minWidth: 0, 
        overflow: isMobile ? 'visible' : 'hidden',
        paddingTop: isMobile ? '60px' : 0
      }}>
        {activeTab === 'dashboard' && (
          <DashboardHome 
            user={activeOperator} 
            t={t} 
            agencies={agencies} 
            profiles={profiles}
            calendar={bookingSchedule}
          />
        )}

        {activeTab === 'inbox' && (
          <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden', position: 'relative' }} className="fade-in inbox-grid">
            {/* Column 1: Inbox List */}
            {(!isMobile || mobileView === 'list') && (
              <div className={`inbox-panel ${!selectedChatId ? 'active' : ''}`} style={{ width: isMobile ? '100%' : '380px', flexShrink: 0, borderRight: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid var(--card-border)' }}>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>{t('inbox')} ({activeProfile?.name || '...'})</h2>
                  <div style={{ position: 'relative' }}>
                    <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input type="text" placeholder={t('searchPlaceholder')} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.85rem 0.85rem 0.85rem 2.5rem', borderRadius: '12px', color: 'white' }} />
                  </div>
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {filteredMessages.length > 0 ? filteredMessages.map(msg => (
                    <div key={msg.id} onClick={() => { 
                      setSelectedChatId(msg.id); 
                      if (isMobile) setMobileView('chat');
                      if (!isTranslating) {
                        setSourceText("");
                        setTranslatedText("");
                      }
                      setInternalNote("");
                      if (msg.from && !clientNotes[msg.from]) {
                        setClientNotes(prev => ({ ...prev, [msg.from]: [] }));
                      }
                    }}
                      style={{ 
                        padding: '1.5rem', 
                        borderBottom: '1px solid var(--card-border)', 
                        background: selectedChat?.id === msg.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent', 
                        cursor: 'pointer', 
                        position: 'relative',
                        borderLeft: selectedChat?.id === msg.id ? '6px solid var(--accent-color)' : '6px solid transparent',
                        boxShadow: selectedChat?.id === msg.id ? 'inset 0 0 20px rgba(59, 130, 246, 0.1)' : 'none',
                        transition: 'all 0.2s ease'
                      }}>
                      {msg.status === 'unread' && <div className="dot"></div>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span style={{ fontWeight: selectedChat?.id === msg.id ? '800' : '700', fontSize: '1.1rem', color: selectedChat?.id === msg.id ? 'white' : 'inherit' }}>
                          {clientNames[msg.from] || msg.from}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{msg.time}</span>
                      </div>
                      <div className="truncate-text" style={{ opacity: selectedChat?.id === msg.id ? 1 : 0.7 }}>{msg.text}</div>
                    </div>
                  )) : <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('noMessages')}</div>}
                  <div style={{ height: isMobile ? '80px' : '0' }}></div>
                </div>
              </div>
            )}

            {/* Column 2 & 3 Container */}
            {(!isMobile || mobileView !== 'list') && (
              <div className={`inbox-panel ${selectedChatId ? 'active' : ''} ${isMobile && !selectedChatId ? 'hidden-mobile' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', minWidth: 0, overflow: 'hidden' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)', minWidth: 0 }}>
                  {/* Stable Debug Chat Detail */}
                  {selectedChat ? (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                      <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          {isMobile && <button onClick={() => setMobileView('list')} style={{ background: 'none', border: 'none', color: 'white' }}><ChevronLeft size={24} /></button>}
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.9rem' }}>
                            {(clientNames[selectedChat.from] || selectedChat.from).slice(-2)}
                          </div>
                          <div>
                            <div style={{ fontWeight: '800', fontSize: '1.2rem' }}>{clientNames[selectedChat.from] || selectedChat.from}</div>
                            {clientNames[selectedChat.from] && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{selectedChat.from}</div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <button onClick={startCall} className="status-badge" style={{ color: 'var(--accent-color)', cursor: 'pointer' }}><Signal size={16} /> CALL</button>
                          <MoreVertical size={20} color="var(--text-secondary)" />
                        </div>
                      </div>
                      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', background: 'rgba(0,0,0,0.2)' }}>
                         <div className="message-bubble-in" style={{ marginBottom: '1rem' }}>{selectedChat.text}</div>
                         <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--card-border)', borderRadius: '12px' }}>
                            Chat history and tools are temporarily simplified for stability.
                         </div>
                      </div>
                      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--card-border)' }}>
                         {selectedChat && activeProfile?.quickReplies?.length > 0 && (
                           <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }} className="custom-scrollbar">
                             {activeProfile.quickReplies.map((reply) => (
                               <button
                                 key={reply.id}
                                 onClick={() => setMessageValue(reply.text)}
                                 style={{ 
                                   whiteSpace: 'nowrap',
                                   background: 'rgba(59, 130, 246, 0.1)',
                                   border: '1px solid rgba(59, 130, 246, 0.3)',
                                   color: 'var(--accent-color)',
                                   padding: '0.4rem 0.8rem',
                                   borderRadius: '8px',
                                   fontSize: '0.75rem',
                                   fontWeight: '700',
                                   cursor: 'pointer'
                                 }}
                               >
                                 {reply.label}
                               </button>
                             ))}
                           </div>
                         )}
                         <div style={{ display: 'flex', gap: '1rem' }}>
                            <input 
                              type="text" 
                              value={messageValue}
                              onChange={(e) => setMessageValue(e.target.value)}
                              placeholder="Type a message..." 
                              style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '1rem', borderRadius: '12px', color: 'white' }} 
                            />
                            <button 
                              onClick={() => {
                                if (messageValue.trim()) {
                                  // Simplified send logic for demo
                                  setMessageValue('');
                                }
                              }}
                              style={{ background: 'var(--accent-color)', color: 'white', border: 'none', padding: '0 1.5rem', borderRadius: '12px', fontWeight: '800' }}
                            >
                              SEND
                            </button>
                         </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
                      <div>
                        <MessageSquare size={64} style={{ opacity: 0.2, marginBottom: '1.5rem' }} />
                        <h3 style={{ color: 'var(--text-secondary)' }}>Select a conversation</h3>
                      </div>
                    </div>
                  )}
                </div>

                {/* Column 3: Notes / Details */}
                {(!isMobile || mobileView === 'details') && (
                  <div className="notes-panel-container" style={{ 
                    width: isMobile ? '100%' : '400px', 
                    flexShrink: 0, 
                    borderLeft: isMobile ? 'none' : '1px solid var(--card-border)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    background: 'var(--bg-color)', 
                    overflow: 'hidden',
                    position: isMobile ? 'absolute' : 'static',
                    top: 0, right: 0, bottom: 0, zIndex: 1100
                  }}>
                    {isMobile && (
                      <div style={{ padding: '1rem', borderBottom: '1px solid var(--card-border)' }}>
                        <button onClick={() => setMobileView('chat')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <ChevronLeft size={20} /> {t('backToChat')}
                        </button>
                      </div>
                    )}
                    {selectedChat ? (
                      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
                         <div style={{ display: 'flex', borderBottom: '1px solid var(--card-border)', background: 'rgba(255, 255, 255, 0.02)' }}>
                           <button onClick={() => setActiveContextTab('translator')} style={{ flex: 1, padding: '0.75rem', border: 'none', background: 'transparent', color: activeContextTab === 'translator' ? 'var(--accent-color)' : 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                             <Languages size={16} /> {t('aiTranslator') || 'AI Translator'}
                           </button>
                           <button onClick={() => setActiveContextTab('note')} style={{ flex: 1, padding: '0.75rem', border: 'none', background: 'transparent', color: activeContextTab === 'note' ? '#f59e0b' : 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                             <StickyNote size={16} /> {t('internalNote') || 'Internal Note'}
                           </button>
                         </div>
                        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
                          {activeContextTab === 'translator' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              <textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder={t('typeResponse')} style={{ width: '100%', height: '100px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '1rem', color: 'white', resize: 'none' }} />
                              <button onClick={handleTranslate} disabled={isTranslating} style={{ background: 'var(--accent-color)', color: 'white', border: 'none', padding: '0.75rem 1rem', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}>
                                {isTranslating ? (
                                  <>
                                    <div className="loader-dots" style={{ display: 'flex', gap: '4px' }}>
                                      <span style={{ width: '4px', height: '4px', background: 'white', borderRadius: '50%' }}></span>
                                      <span style={{ width: '4px', height: '4px', background: 'white', borderRadius: '50%' }}></span>
                                      <span style={{ width: '4px', height: '4px', background: 'white', borderRadius: '50%' }}></span>
                                    </div>
                                    {t('translating')}
                                  </>
                                ) : (
                                  <>
                                    <Sparkles size={16} /> {lang === 'cz' ? 'PŘELOŽIT PŘES AI' : 'TRANSLATE VIA AI'}
                                  </>
                                )}
                              </button>
                              {translatedText && (
                                <div className="fade-in" style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px', position: 'relative' }}>
                                  <div style={{ position: 'absolute', top: '-8px', right: '12px', background: 'var(--accent-color)', color: 'white', fontSize: '0.6rem', fontWeight: '900', padding: '2px 8px', borderRadius: '4px' }}>{t('poweredByAi')}</div>
                                  <div style={{ fontSize: '0.9rem', color: 'white', lineHeight: '1.5' }}>{translatedText}</div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} placeholder="Add internal note..." style={{ width: '100%', minHeight: '100px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '12px', padding: '1rem', color: '#f59e0b' }} />
                              <button onClick={handleSaveNote} disabled={!internalNote.trim()} style={{ alignSelf: 'flex-end', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: '700' }}>Save Note</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('selectConversationDesc')}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
   
        {activeTab === 'calendar' && (
          <div style={{ padding: '3rem', paddingBottom: '8rem', flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }} className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: '800' }}>{t('bookingSchedule')} - {activeProfile?.name || '...'}</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{t('bookingScheduleDesc')}</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                 <div className="status-badge" style={{ borderColor: 'var(--accent-color)', color: 'var(--accent-color)' }}>
                   <Activity size={16} /> {bookingSchedule.length} {t('events')}
                 </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', flex: 1, minHeight: 0 }}>
              <div className="glass-card" style={{ padding: '2rem', overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {bookingSchedule.sort((a,b) => {
                    const timeToMins = (t) => {
                      const [h, m] = t.split(' ')[0].split(':').map(Number);
                      const isPm = t.includes('PM') && h !== 12;
                      return (isPm ? h + 12 : (t.includes('AM') && h === 12 ? 0 : h)) * 60 + (m || 0);
                    };
                    return timeToMins(a.time) - timeToMins(b.time);
                  }).map((event, idx) => (
                    <div key={idx} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1.5rem', 
                      padding: '1.25rem', 
                      background: 'rgba(255,255,255,0.02)', 
                      borderRadius: '16px', 
                      border: '1px solid var(--card-border)',
                      borderLeft: `4px solid ${event.type === 'work' ? 'var(--accent-color)' : 'var(--warning-color)'}`
                    }}>
                      <div style={{ width: '80px', flexShrink: 0 }}>
                        <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>{event.time}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{event.duration}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.2rem' }}>{event.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: event.status === 'busy' ? 'var(--error-color)' : 'var(--success-color)' }}></div>
                          {event.status.toUpperCase()}
                        </div>
                      </div>
                      <div style={{ opacity: 0.5 }}>
                        <MoreVertical size={18} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={18} color="var(--warning-color)" /> {t('recommendedSlots')}
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {MOCK_CALENDAR.suggestions.map(s => (
                      <div key={s} className="status-badge" style={{ background: 'rgba(245, 158, 11, 0.1)', cursor: 'pointer', border: '1px solid var(--warning-color)', color: 'white' }}>{s}</div>
                    ))}
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px dashed var(--accent-color)' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: '800', marginBottom: '1rem' }}>{t('operatorTip')}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    {t('operatorTipDesc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'web-profiles' && (
          <div style={{ padding: '2rem', flex: 1, overflowY: 'auto', display: 'flex', gap: '1.5rem', maxHeight: '100%' }} className="fade-in custom-scrollbar">
            {/* Left Content Area (Gallery & Bio) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: '900', background: 'linear-gradient(to right, #fff, var(--accent-color))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {activeProfile?.name || '...'}
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('webProfilesDesc')}</p>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Image size={20} color="var(--accent-color)" /> {t('gallery')}</h3>
                  <button className="action-btn" style={{ width: 'auto', padding: '0.5rem 1rem', marginTop: 0, fontSize: '0.8rem' }}>+ {t('uploadPhoto')}</button>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-secondary)' }}>{t('publicGalleryCap')}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem' }}>
                      <div className="placeholder-img" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200)' }}></div>
                      <div className="placeholder-img" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=200)' }}></div>
                      <div className="placeholder-img" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200)' }}></div>
                    </div>
                  </div>
                  <div style={{ width: '1px', background: 'var(--card-border)' }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-secondary)' }}>{t('privateGalleryCap')} (VIP)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem' }}>
                      <div className="placeholder-img" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200)' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    <FileEdit size={24} color="var(--accent-color)" /> {t('biography')} & {t('services')}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
                    <button style={{ padding: '6px 12px', border: 'none', background: 'var(--accent-color)', color: 'white', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}>EN</button>
                    <button style={{ padding: '6px 12px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}>CZ</button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div className="input-group-premium">
                    <label className="input-label-premium">{t('mottoLabel')}</label>
                    <input 
                      type="text" 
                      defaultValue={activeProfile?.bio || ''} 
                      className="note-input" 
                      style={{ 
                        fontSize: '1.25rem', 
                        fontWeight: '700', 
                        letterSpacing: '-0.01em',
                        borderBottom: '2px solid rgba(255, 255, 255, 0.1)'
                      }}
                      placeholder="Enter a catchy headline..."
                    />
                  </div>
                  
                  <div className="input-group-premium">
                    <label className="input-label-premium">{t('fullBioLabel')}</label>
                    <textarea 
                      className="note-input" 
                      style={{ 
                        height: '300px', 
                        lineHeight: '1.7', 
                        fontSize: '1.1rem',
                        borderBottom: '2px solid rgba(255, 255, 255, 0.1)'
                      }} 
                      defaultValue="Hi, I am available in the city center. VIP companion offering GFE, outcalls and incalls. Very friendly and open minded..."
                      placeholder={t('bioPlaceholder')}
                    ></textarea>
                    <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                      <span>{t('bioFormattingNote')}</span>
                      <span style={{ color: 'var(--accent-color)' }}>128 / 2000</span>
                    </div>
                  </div>
                  
                  <button className="action-btn" style={{ width: 'fit-content', padding: '1rem 2.5rem', fontSize: '1rem', marginTop: '1rem', boxShadow: '0 10px 20px rgba(59, 130, 246, 0.2)' }}>
                    {t('saveChanges')}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Sync Area */}
            <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(5,7,10,0.6)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1.1rem' }}>
                  <RefreshCw size={18} color="var(--success-color)" className={isSyncing ? "spin-animation" : ""} /> {t('syncStatus')}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                  <div className="sync-platform-row" style={{ padding: '0.75rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="platform-icon" style={{ width: '28px', height: '28px', fontSize: '0.6rem' }}>AW</div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.8rem' }}>AdultWork.com</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{t('ukPrimary')}</div>
                      </div>
                    </div>
                    <div className={`sync-badge ${syncStatus.aw}`} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                      {syncStatus.aw === 'syncing' ? <RefreshCw size={10} className="spin-animation" /> : (syncStatus.aw === 'synced' ? <Check size={10} /> : <X size={10} />)}
                      {syncStatus.aw.toUpperCase()}
                    </div>
                  </div>

                  <div className="sync-platform-row" style={{ padding: '0.75rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="platform-icon" style={{ width: '28px', height: '28px', fontSize: '0.6rem' }}>EG</div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.8rem' }}>EuroGirlsEscort</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{t('euWide')}</div>
                      </div>
                    </div>
                    <div className={`sync-badge ${syncStatus.ege}`} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                      {syncStatus.ege === 'syncing' ? <RefreshCw size={10} className="spin-animation" /> : (syncStatus.ege === 'synced' ? <Check size={10} /> : <X size={10} />)}
                      {syncStatus.ege.toUpperCase()}
                    </div>
                  </div>

                  <div className="sync-platform-row" style={{ padding: '0.75rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="platform-icon" style={{ width: '28px', height: '28px', fontSize: '0.6rem' }}>TP</div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.8rem' }}>ThePuntersB...</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{t('reviewSync')}</div>
                      </div>
                    </div>
                    <div className={`sync-badge ${syncStatus.tpb}`} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                      {syncStatus.tpb === 'syncing' ? <RefreshCw size={10} className="spin-animation" /> : (syncStatus.tpb === 'synced' ? <Check size={10} /> : <AlertTriangle size={10} />)}
                      {syncStatus.tpb.toUpperCase()}
                    </div>
                  </div>
                </div>

                {isSyncing ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: '700' }}><span>{t('syncingProfileData')}</span><span>{syncProgress}%</span></div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${syncProgress}%`, height: '100%', background: 'var(--accent-color)', transition: 'width 0.2s ease' }}></div>
                    </div>
                  </div>
                ) : (
                  <button onClick={handleSyncAll} className="action-btn" style={{ background: 'var(--success-color)', boxShadow: '0 5px 15px rgba(16, 185, 129, 0.3)' }}><RefreshCw size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} /> {t('syncAll')}</button>
                )}

                <div style={{ marginTop: '1.5rem', fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px' }}>
                  <Link size={14} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                  {t('proxyNote')}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'device-setup' && (
          <div style={{ padding: '2rem', flex: 1, overflowY: 'auto', maxHeight: '100%' }} className="fade-in custom-scrollbar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Smartphone size={28} color="var(--accent-color)" /> {t('deviceSetup')}
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{t('deviceSetupDesc')}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '2rem' }}>
              {/* SMS Setup */}
              <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageSquare size={24} color="#3b82f6" />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>{t('smsSync')}</h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  {t('smsSyncDesc')}
                </p>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <a href="https://play.google.com/store/apps/details?id=enstone.smsfw.app" target="_blank" rel="noreferrer" className="action-btn" style={{ flex: 1, textDecoration: 'none', textAlign: 'center', background: '#3b82f6', color: 'white' }}>
                    Google Play ({t('smsSync')})
                  </a>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#3b82f6', marginBottom: '0.5rem' }}>{t('webhookLabel')}</div>
                  <code style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>http://78.141.202.139:3001/api/device/mobile/sms</code>
                </div>

                <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--card-border)', paddingTop: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--accent-color)' }}>{t('smsGuideTitle')}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[1, 2, 3, 4, 5].map(step => (
                      <div key={step} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <div style={{ minWidth: '18px', height: '18px', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '800', color: '#3b82f6' }}>{step}</div>
                        <div>{(t(`smsStep${step}`) || '').toString().substring(3)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Call Setup */}
              <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Phone size={24} color="#10b981" />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>{t('callSync')}</h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  {t('callSyncDesc')}
                </p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <a href="https://play.google.com/store/apps/details?id=com.llamalab.automate" target="_blank" rel="noreferrer" className="action-btn" style={{ flex: 1, textDecoration: 'none', textAlign: 'center', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--card-border)' }}>
                    Automate
                  </a>
                  <a href="https://play.google.com/store/apps/details?id=net.dinglisch.android.tasker" target="_blank" rel="noreferrer" className="action-btn" style={{ flex: 1, textDecoration: 'none', textAlign: 'center', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--card-border)' }}>
                    Tasker
                  </a>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#10b981', marginBottom: '0.5rem' }}>{t('webhookLabel')}</div>
                  <code style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>http://78.141.202.139:3001/api/device/mobile/call</code>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ marginTop: '2rem', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Zap size={20} color="var(--accent-color)" /> {t('whyTheseApps')}
              </h3>
              <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
                <li><strong>{t('safetyLabel')}:</strong> {t('safetyReason')}</li>
                <li><strong>{t('stabilityLabel')}:</strong> {t('stabilityReason')}</li>
                <li><strong>{t('flexibilityLabel')}:</strong> {t('flexibilityReason')}</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'hierarchy' && activeOperator?.isAdmin && (
          <div style={{ padding: '2rem', flex: 1, overflowY: 'auto', maxHeight: '100%' }} className="fade-in custom-scrollbar">
            <h2 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '1rem', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('teamHierarchy')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1.1rem' }}>{t('teamHierarchyDesc')}</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {MOCK_OPERATORS.filter(op => op?.clientId === activeOperator?.clientId && !op?.isAdmin && !op?.isSuperAdmin).map(op => {
                const assignedModels = MOCK_PROFILES.filter(p => p.operators.some(o => o.id === op.id && o.active));
                return (
                  <div key={op.id} className="glass-card" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ width: '60px', height: '60px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent-color)' }}>
                          {op.avatar}
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.5rem', fontWeight: '800' }}>{op.name}</h3>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{op.role === 'Night Shift' ? t('nightShift') : op.role} • {assignedModels.length} {t('assignedModels')}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>{t('todaysPerformance')}</div>
                        <div style={{ display: 'flex', gap: '1.5rem' }}>
                          <div>
                            <div style={{ fontSize: '1.1rem', fontWeight: '800' }}>{op.metrics?.messages || 0}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{t('messages')}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '1.1rem', fontWeight: '800' }}>{op.metrics?.conversion || '0%'}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{t('conversion').toUpperCase()}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                      {assignedModels.map(model => (
                        <div key={model.id} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ width: '40px', height: '40px', background: 'var(--accent-color)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '0.8rem' }}>
                            {model.username?.substring(0,2).toUpperCase() || '??'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{model.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: model.status === 'online' ? 'var(--success-color)' : 'var(--text-secondary)' }} />
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{(t(model.status) || '').toString().toUpperCase()}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: '800' }}>{model.unreadCount}</div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{t('unread').toUpperCase()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'referrals' && (
          <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }} className="fade-in custom-scrollbar">
            <div style={{ marginBottom: '3rem' }}>
              <h2 style={{ fontSize: isMobile ? '1.8rem' : '2.5rem', fontWeight: '900', marginBottom: '1rem', background: 'linear-gradient(to right, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {t('referralProgram')}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>{t('referralsSubtitle')}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
              {[
                { label: (t('clicks') || '').toUpperCase(), value: MOCK_REFERRALS[activeOperator?.id]?.stats?.clicks || 0, icon: Activity, color: '#3b82f6' },
                { label: (t('signups') || '').toUpperCase(), value: MOCK_REFERRALS[activeOperator?.id]?.stats?.signups || 0, icon: UserPlus, color: '#10b981' },
                { label: (t('earned') || '').toUpperCase(), value: MOCK_REFERRALS[activeOperator?.id]?.stats?.earned || '£0', icon: Trophy, color: '#f59e0b' },
                { label: (t('pending') || '').toUpperCase(), value: MOCK_REFERRALS[activeOperator?.id]?.stats?.pending || '£0', icon: Clock, color: 'var(--text-secondary)' }
              ].map((stat, i) => (
                <div key={i} className="glass-card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <stat.icon size={18} color={stat.color} />
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>{stat.label}</span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '900' }}>{stat.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '2rem', marginBottom: '3rem' }}>
              <div className="glass-card" style={{ flex: 1, padding: '2rem', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Link size={20} color="#f59e0b" /> {t('referralLinkHeader')}
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  {t('referralLinkDesc')}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--card-border)', fontFamily: 'monospace', fontSize: '0.9rem', color: '#f59e0b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {MOCK_REFERRALS[activeOperator?.id]?.link || 'https://nexus.sync/ref/default'}
                  </div>
                  <button className="action-btn" style={{ width: 'auto', padding: '0 1.5rem', marginTop: 0, background: 'var(--accent-color)' }}>
                    <Copy size={18} />
                  </button>
                </div>
              </div>

              <div className="glass-card" style={{ width: isMobile ? '100%' : '400px', padding: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.5rem' }}>{t('whyRefer')}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={18} color="#10b981" />
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{t('recurringCommission')}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('recurringCommissionDesc')}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Zap size={18} color="#3b82f6" />
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{t('instantCredits')}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('instantCreditsDesc')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.02)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>{t('activeReferralsHistory')}</h3>
              </div>
              <div style={{ padding: '0 1rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800' }}>
                      <th style={{ padding: '1.25rem 1rem' }}>{t('entity').toUpperCase()}</th>
                      <th style={{ padding: '1.25rem 1rem' }}>{t('date').toUpperCase()}</th>
                      <th style={{ padding: '1.25rem 1rem' }}>{t('status').toUpperCase()}</th>
                      <th style={{ padding: '1.25rem 1rem', textAlign: 'right' }}>{t('reward').toUpperCase()}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(MOCK_REFERRALS[activeOperator?.id]?.history || []).map((item) => (
                      <tr key={item.id} style={{ borderTop: '1px solid var(--card-border)' }}>
                        <td style={{ padding: '1.25rem 1rem' }}>
                          <div style={{ fontWeight: '700' }}>{item.entity}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ID: REF-{item.id}00X</div>
                        </td>
                        <td style={{ padding: '1.25rem 1rem', fontSize: '0.85rem' }}>{item.date}</td>
                        <td style={{ padding: '1.25rem 1rem' }}>
                          <span style={{ 
                            padding: '0.25rem 0.6rem', 
                            borderRadius: '6px', 
                            fontSize: '0.7rem', 
                            fontWeight: '800',
                            background: item.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: item.status === 'Active' ? '#10b981' : '#f59e0b',
                            border: `1px solid ${item.status === 'Active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                          }}>
                            {item.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '1.25rem 1rem', textAlign: 'right', fontWeight: '800', color: '#f59e0b' }}>{item.reward}</td>
                      </tr>
                    ))}
                    {(!MOCK_REFERRALS[activeOperator?.id]?.history || MOCK_REFERRALS[activeOperator?.id]?.history?.length === 0) && (
                      <tr>
                        <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          {t('noReferralActivity')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && rolePermissions[activeOperator?.role]?.analytics && (
          <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }} className="fade-in custom-scrollbar">
            <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '2.5rem' }}>{t('agencyOverview')}</h2>
            
            {/* Top Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  <DollarSign size={20} color="var(--success-color)" />
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.05em' }}>{t('totalRevenue').toUpperCase()}</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '900' }}>£15,490</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--success-color)', marginTop: '0.5rem', fontWeight: '700' }}>+12.4% {t('vsLastWeek')}</div>
              </div>
              
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  <Calendar size={20} color="var(--accent-color)" />
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.05em' }}>{t('activeBookings').toUpperCase()}</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '900' }}>89</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--success-color)', marginTop: '0.5rem', fontWeight: '700' }}>+5 {t('thisWeek')}</div>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  <MessageSquare size={20} color="#a855f7" />
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.05em' }}>{t('totalMessages').toUpperCase()}</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '900' }}>2,148</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{t('acrossAllProfiles')}</div>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  <TrendingUp size={20} color="#f59e0b" />
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.05em' }}>{t('conversionRate').toUpperCase()}</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '900' }}>11.5%</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--success-color)', marginTop: '0.5rem', fontWeight: '700' }}>+1.2% {t('trend')}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '2rem' }}>
              {/* Left Column: Profile Earnings */}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={20} color="var(--accent-color)" /> {t('perfByProfile')}
                </h3>
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--card-border)' }}>
                        <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>PROFILE</th>
                        <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{t('rank').toUpperCase()}</th>
                        <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{t('activeBookings').toUpperCase()}</th>
                        <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'right' }}>{t('earnings').toUpperCase()}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allAgencyProfiles.sort((a,b) => parseInt(b.earnings.replace(/\D/g,'')) - parseInt(a.earnings.replace(/\D/g,''))).map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                          <td style={{ padding: '1rem', fontWeight: '700' }}>{p.name}</td>
                          <td style={{ padding: '1rem' }}><div className="status-badge-small" style={{ borderColor: 'var(--success-color)', color: 'var(--success-color)' }}>{t('topRank', { rank: p.rank })}</div></td>
                          <td style={{ padding: '1rem', color: 'white' }}>{p.bookings}</td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '800', color: 'var(--accent-color)' }}>{p.earnings}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: Operator Activity */}
              <div style={{ width: '450px' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={20} color="var(--accent-color)" /> {t('perfByOperator')}
                </h3>
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--card-border)' }}>
                        <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>OPERATOR</th>
                        <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'right' }}>{t('totalMessages').toUpperCase()}</th>
                        <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'right' }}>{t('callsHandled').toUpperCase()}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableOperators.sort((a,b) => b.metrics.messages - a.metrics.messages).map((op, i) => (
                        <tr key={op.id} style={{ borderBottom: i < availableOperators.length - 1 ? '1px solid var(--card-border)' : 'none' }}>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: '900' }}>{op.avatar}</div>
                              <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{op.name}</div>
                            </div>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700' }}>{op.metrics.messages}</td>
                          <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{op.metrics.calls}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'profiles' && (
          <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }} className="fade-in custom-scrollbar">
            <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '2rem' }}>{t('managedProfiles')}</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {allAgencyProfiles.map((profile, i) => {
                const isMyProfile = myProfiles.find(p => p.id === profile.id);
                const activeCount = profile.operators.filter(op => op.active).length;

                return (
                  <div key={i} className="glass-card" style={{ padding: '2rem', display: 'flex', gap: '2.5rem', borderColor: isMyProfile ? 'rgba(59, 130, 246, 0.4)' : 'var(--card-border)' }}>
                    <div style={{ flex: '0 0 250px' }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '0.5rem' }}>{profile.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                        <div style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', background: activeCount > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: activeCount > 0 ? 'var(--success-color)' : 'var(--error-color)', fontSize: '0.7rem', fontWeight: '900', border: '1px solid currentColor' }}>
                          {activeCount > 0 ? `${activeCount} ${t('operatorsActive')}` : t('noCoverage')}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleOperatorStatus(profile.id, activeOperator?.id)}
                        className={`action-btn ${isMyProfile ? 'active' : ''}`}
                        style={{ background: isMyProfile ? 'rgba(239, 68, 68, 0.2)' : 'var(--accent-color)', color: isMyProfile ? 'var(--error-color)' : 'white' }}
                      >
                        {isMyProfile ? t('deactivateMySeat') : t('activateMySeat')}
                      </button>
                      <button
                        onClick={() => handleEditProfile(profile)}
                        style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--accent-color)', background: 'rgba(59, 130, 246, 0.1)', color: 'white', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                      >
                        <Settings size={16} /> {t('editProfile')}
                      </button>
                      <button
                        onClick={() => {
                          setActiveProfileId(profile.id);
                          setActiveTab('inbox');
                        }}
                        style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'transparent', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                      >
                        {t('openContext')}
                      </button>

                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '1rem', letterSpacing: '0.05em' }}>{t('assignedTeam')}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                        {profile.operators.map(profileOp => {
                          const opData = MOCK_OPERATORS.find(o => o.id === profileOp.id);
                          return (
                            <div key={profileOp.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '15px', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: '1rem', opacity: profileOp.active ? 1 : 0.4 }}>
                              <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: '900' }}>{opData.avatar}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{opData.name}</div>
                                <div style={{ fontSize: '0.65rem', color: profileOp.primary ? 'var(--accent-color)' : 'var(--text-secondary)' }}>{profileOp.primary ? t('primary') : t('support')}</div>
                              </div>
                              {profileOp.active && <UserCheck size={16} color="var(--success-color)" />}
                            </div>
                          );
                        })}
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', borderRadius: '15px', border: '1px dashed var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                           <UserPlus size={16} /> <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>{t('add')}</span>
                         </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }} className="fade-in custom-scrollbar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
              <div><h2 style={{ fontSize: '2rem', fontWeight: '800' }}>{t('auditTrail')} - {activeClient?.name || t('system')}</h2><p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{t('auditSubtitle')}</p></div>
              <div className="status-badge" style={{ borderColor: 'var(--accent-color)', color: 'var(--accent-color)' }}><Shield size={16} /> {t('encryptedLog')}</div>
            </div>
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--card-border)' }}>
                  {[t('timestamp'), t('event'), t('handledBy'), t('target'), t('hash')].map(h => <th key={h} style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{h}</th>)}
                </tr></thead>
                <tbody>{MOCK_AUDIT_LOG.filter(log => availableOperators.some(op => op.name === log.operator)).map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td style={{ padding: '1.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{log.timestamp}</td>
                    <td style={{ padding: '1.25rem', fontWeight: '700' }}>{log.action}</td>
                    <td style={{ padding: '1.25rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={14} /> {log.operator}</div></td>
                    <td style={{ padding: '1.25rem' }}>{log.profile !== 'N/A' ? <div className="status-badge-small">{log.profile}</div> : '-'}</td>
                    <td style={{ padding: '1.25rem' }}><code className="hash-code">{log.hash}</code></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }} className="fade-in custom-scrollbar">
            <h2 style={{ fontSize: '2rem', fontWeight: '800' }}>{t('controlCenter')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem' }}>{t('configSubtitle')}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', maxWidth: '800px' }}>
              <div className="settings-section">
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Building2 size={20} color="var(--accent-color)" /> {t('agencyInsight')}: {activeClient?.name || t('global')}</h3>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800', marginBottom: '0.5rem' }}>{t('teamSeats')}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{availableOperators.length} / 10</div>
                  </div>
                  <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800', marginBottom: '0.5rem' }}>{t('regionalReach')}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{activeClient?.region || t('global')}</div>
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Smartphone size={20} color="var(--accent-color)" /> {t('sessionTopology')}</h3>
                <div className="glass-card" style={{ padding: 0 }}>
                  {MOCK_SESSIONS.map((s, i) => (
                    <div key={i} style={{ padding: '1.5rem', borderBottom: i < MOCK_SESSIONS.length - 1 ? '1px solid var(--card-border)' : 'none', display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: '1.25rem' }}>
                        <div style={{ background: s.current ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '12px' }}><Smartphone size={20} color={s.current ? 'var(--accent-color)' : 'var(--text-secondary)'} /></div>
                        <div><div style={{ fontWeight: '700' }}>{s.device} {s.current && <span style={{ color: 'var(--success-color)', fontSize: '0.7rem' }}>({t('thisDevice')})</span>}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.location} • {s.status}</div></div>
                      </div>
                      <div className="status-badge">{s.current ? t('secure') : t('revoke')}</div>
                    </div>
                  ))}
                </div>
              </div>

              {rolePermissions[activeOperator?.role]?.global_features && (
                <div className="settings-section">
                  <h3 style={{ marginBottom: '1.5rem' }}>{t('simulationTools')}</h3>
                  <button onClick={simulateIncomingCall} className="action-btn" style={{ maxWidth: '300px' }}><Phone size={16} /> {t('simulateCall')}</button>
                </div>
              )}
            </div>

            {rolePermissions[activeOperator?.role]?.analytics && !rolePermissions[activeOperator?.role]?.infrastructure && (
              <div className="glass-card" style={{ padding: '2rem', marginTop: '3rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '2rem' }}>{t('operatorPerformance')}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {MOCK_OPERATORS.filter(op => op?.clientId === activeOperator?.clientId && !op?.isAdmin && !op?.isSuperAdmin).map(op => (
                    <div key={op.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'var(--accent-color)' }}>{op.avatar}</div>
                        <div>
                          <div style={{ fontWeight: '700' }}>{op.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{op.role === 'Night Shift' ? t('nightShift') : op.role}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '3rem', textAlign: 'right' }}>
                        <div>
                          <div style={{ fontSize: '1rem', fontWeight: '800' }}>{op.metrics?.messages || 0}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{(t('messages') || 'MESSAGES').toUpperCase()}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '1rem', fontWeight: '800' }}>{op.metrics?.calls || 0}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{(t('calls') || 'CALLS').toUpperCase()}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--success-color)' }}>{op.metrics?.conversion || '0%'}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{(t('convRate') || 'CONV. RATE').toUpperCase()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'hierarchy' && rolePermissions[activeOperator?.role]?.hierarchy && (
           <div style={{ padding: '3rem', flex: 1, overflowY: 'auto' }} className="fade-in">
             <h2 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '1rem' }}>{t('teamHierarchy')}</h2>
             <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem' }}>{t('teamHierarchyDesc')}</p>
             {/* ... existing hierarchy content ... */}
           </div>
        )}

        {activeTab === 'qa' && (
          <QAView 
            t={t} 
            messages={messages} 
            clientNotes={clientNotes} 
            clientNames={clientNames}
            updateClientName={updateClientName}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView t={TRANSLATIONS[lang]} />
        )}

        {activeTab === 'infra' && rolePermissions[activeOperator?.role]?.infrastructure && (
          <div style={{ padding: '3rem', paddingBottom: '8rem', flex: 1, overflowY: 'auto' }} className="fade-in custom-scrollbar">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3rem' }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '1rem', background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('infraTitle')}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>{t('infraSubtitle')}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
              {/* Stats Overview */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                {[
                  { label: t('totalAgencies'), value: agencies.length, icon: <Building2 size={20} />, color: '#3b82f6', trend: `+2 ${t('thisMonth')}` },
                  { label: t('activeProfiles'), value: profiles.length, icon: <Users size={20} />, color: '#8b5cf6', trend: t('globalReach') },
                  { label: t('monthlyRevenue'), value: '$1.2M', icon: <CreditCard size={20} />, color: '#10b981', trend: `+12% ${t('growth')}` },
                  { label: t('systemUptime'), value: '99.98%', icon: <Activity size={20} />, color: '#f59e0b', trend: t('allNodesActive') }
                ].map((stat, i) => (
                  <div key={i} className="glass-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div style={{ background: `${stat.color}20`, padding: '0.5rem', borderRadius: '10px' }}>
                        {stat.icon}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: stat.color, fontWeight: '800' }}>{stat.trend}</div>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: '800', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{stat.label}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Infrastructure Monitor */}
              <div className="glass-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Server size={24} color="var(--accent-color)" /> {t('nodeStatus')}
                  </h3>
                  <div className="status-badge" style={{ borderColor: 'var(--success-color)', color: 'var(--success-color)' }}>
                    <ShieldCheck size={14} /> {t('proxyActive')}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
                  {[
                    { node: 'UK-LDN-01', location: 'London, UK', status: 'Optimal', latency: '42ms', load: '12%' },
                    { node: 'US-NYC-04', location: 'New York, USA', status: 'Optimal', latency: '115ms', load: '28%' },
                    { node: 'EU-PRG-02', location: 'Prague, CZ', status: 'Optimal', latency: '18ms', load: '5%' }
                  ].map((node, i) => (
                    <div key={i} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '15px', border: '1px solid var(--card-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>{node.node}</div>
                        <div className="dot" style={{ background: 'var(--success-color)', position: 'static', transform: 'none' }}></div>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{node.location}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '700' }}>
                        <span>{t('latency')}: <span style={{ color: 'var(--accent-color)' }}>{node.latency}</span></span>
                        <span>{t('load')}: {node.load}</span>
                      </div>
                      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '0.75rem', overflow: 'hidden' }}>
                        <div style={{ width: node.load, height: '100%', background: 'var(--accent-color)' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'agencies' && rolePermissions[activeOperator?.role]?.agencies && (
          <div style={{ padding: '2rem', flex: 1, overflowY: 'auto', maxHeight: '100%' }} className="fade-in custom-scrollbar">
            <h2 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '1rem', background: 'linear-gradient(to right, #8b5cf6, #d946ef)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('agencyMgmtTitle')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1.1rem' }}>{t('agencyMgmtSubtitle')}</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
              {/* Agency Manager */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building2 size={24} color="#8b5cf6" /> {t('portfolioManager')}
                  </h3>
                  <button 
                    onClick={() => setIsAddAgencyModalOpen(true)}
                    className="action-btn" 
                    style={{ width: 'auto', padding: '0.6rem 1.25rem' }}
                  >
                    {t('provisionNew')}
                  </button>
                </div>
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--card-border)' }}>
                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800' }}>{t('agencyRegion')}</th>
                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800' }}>{t('status')}</th>
                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800' }}>{t('billingTier')}</th>
                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800' }}>{t('equipment')}</th>
                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800', textAlign: 'right' }}>{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agencies.map((agency, i) => {
                        const agencyProfilesCount = profiles.filter(p => p.clientId === agency.id).length;
                        const agencyOps = operators.filter(o => o.clientId === agency.id);
                        const agencyOpsCount = agencyOps.length;
                        return (
                          <tr key={agency.id} style={{ borderBottom: i < agencies.length - 1 ? '1px solid var(--card-border)' : 'none' }}>
                            <td style={{ padding: '1.25rem 1.5rem' }}>
                              <div style={{ fontWeight: '700', fontSize: '1rem' }}>{agency.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('regionLabel')}: {agency.region}</div>
                            </td>
                            <td style={{ padding: '1.25rem 1.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Users size={14} color="var(--accent-color)" />
                                <span style={{ fontWeight: '700' }}>{agencyProfilesCount}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('profilesCount')}</span>
                              </div>
                            </td>
                            <td style={{ padding: '1.25rem 1.5rem' }}>
                              <div style={{ fontSize: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                {Object.entries(
                                  agencyOps.reduce((acc, current) => {
                                      acc[current.role] = (acc[current.role] || 0) + 1;
                                      return acc;
                                    }, {})
                                ).map(([role, count]) => (
                                  <span key={role} style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <strong>{count}</strong> {role}
                                    <Trash2 
                                      size={10} 
                                      style={{ cursor: 'pointer', color: '#ef4444' }} 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const opToDelete = agencyOps.find(o => o.role === role);
                                        if (opToDelete) deleteOperator(opToDelete.id);
                                      }}
                                    />
                                  </span>
                                ))}
                                {agencyOpsCount === 0 && <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{t('noOperators')}</span>}
                                <button 
                                  onClick={() => {
                                    setTargetAgencyId(agency.id);
                                    setIsAddOperatorModalOpen(true);
                                  }}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', padding: 0 }}
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            </td>
                            <td style={{ padding: '1.25rem 1.5rem' }}>
                              <div style={{ 
                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.6rem', borderRadius: '6px',
                                background: agency.subscription.status === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: agency.subscription.status === 'active' ? 'var(--success-color)' : 'var(--error-color)',
                                fontSize: '0.7rem', fontWeight: '800'
                              }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></div>
                                {agency.subscription.status.toUpperCase()}
                              </div>
                            </td>
                            <td style={{ padding: '1.25rem 1.5rem' }}>
                              <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{agency.subscription.plan} {t('planLabel')}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('nextRenewal')}: {agency.subscription.endDate}</div>
                            </td>
                            <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <button 
                                  onClick={() => {
                                    setAgencies(prev => prev.map(a => a.id === agency.id ? { ...a, status: a.status === 'suspended' ? 'active' : 'suspended' } : a));
                                  }}
                                  className="status-badge" 
                                  style={{ 
                                    background: agency.status !== 'suspended' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: agency.status !== 'suspended' ? 'var(--success-color)' : 'var(--error-color)',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {agency.status === 'suspended' ? t('unsuspend').toUpperCase() : t('suspend').toUpperCase()}
                                </button>
                                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                  {['ai_relay', 'enterprise_proxies', 'analytics'].map(f => (
                                    <button 
                                      key={f} 
                                      onClick={() => {}} 
                                      className="status-badge" 
                                      style={{ 
                                        fontSize: '0.6rem', 
                                        padding: '0.15rem 0.4rem', 
                                        background: agency.features?.[f] ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)', 
                                        color: agency.features?.[f] ? 'var(--accent-color)' : 'var(--text-secondary)',
                                        border: '1px solid currentColor',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      {f.split('_')[0].toUpperCase()}
                                    </button>
                                  ))}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--card-border)', paddingTop: '0.5rem' }}>
                                  <button 
                                    onClick={() => deleteAgency(agency.id)}
                                    className="status-badge" 
                                    style={{ fontSize: '0.7rem', color: '#ef4444', borderColor: '#ef4444', cursor: 'pointer' }}
                                  >
                                    {t('delete').toUpperCase()}
                                  </button>
                                  <button 
                                    className="status-badge" 
                                    style={{ fontSize: '0.7rem', color: 'var(--accent-color)', cursor: 'pointer' }}
                                    onClick={() => {
                                      setActiveClient(agency);
                                      const clientOp = operators.find(o => o.clientId === agency.id) || operators.find(o => o.id === 'op-1');
                                      setActiveOperator(clientOp);
                                      setActiveTab('dashboard');
                                    }}
                                  >
                                    {t('impersonate')}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'features' && rolePermissions[activeOperator?.role]?.global_features && (
          <div style={{ padding: '2rem', flex: 1, overflowY: 'auto', maxHeight: '100%' }} className="fade-in custom-scrollbar">
            <h2 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '1rem', background: 'linear-gradient(to right, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('featuresTitle')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1.1rem' }}>{t('featuresSubtitle')}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
              {/* Global Feature Provisioning */}
              <div className="glass-card" style={{ padding: '2rem', background: 'rgba(5,7,10,0.4)', border: '1px dashed var(--accent-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Zap size={24} color="#f59e0b" /> {t('masterFeatureProvisioning')}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700' }}>{t('systemCapabilities').toUpperCase()}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
                  {[
                    { id: 'ai_trans', label: 'Global AI Voice Relay', desc: 'Auto-provision secure voice corridors for phone simulation.', active: true },
                    { id: 'vc_hub', label: 'Cross-Agency Analytics', desc: 'Allow managers to view performance trends across multiple regions.', active: true },
                    { id: 'crm_adv', label: 'Enterprise Proxy Pooling', desc: 'Dynamic residential proxy allocation for enhanced privacy.', active: true },
                    { id: 'stats_bi', label: 'Automatic Payout Processing', desc: 'Scheduled generation of agency-wide billing reports.', active: false }
                  ].map((feature, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '15px', border: '1px solid var(--card-border)' }}>
                      <div>
                        <div style={{ fontWeight: '700', marginBottom: '0.25rem' }}>{feature.label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{feature.desc}</div>
                      </div>
                      <div 
                        onClick={() => {}} // Local simulation
                        className={`toggle-switch ${feature.active ? 'active' : ''}`}
                        style={{ 
                          width: '40px', height: '20px', background: feature.active ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
                          borderRadius: '20px', position: 'relative', cursor: 'pointer', transition: 'all 0.3s'
                        }}
                      >
                        <div style={{ 
                          width: '14px', height: '14px', background: 'white', borderRadius: '50%',
                          position: 'absolute', top: '2px', left: feature.active ? '22px' : '3px', transition: 'all 0.3s'
                        }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Enterprise AI Training Simulation */}
              <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(139, 92, 246, 0.3)', background: 'rgba(139, 92, 246, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Cpu size={24} color="#a855f7" /> {t('aiTrainingEngine')}
                  </h3>
                  <div className="status-badge" style={{ borderColor: '#a855f7', color: '#a855f7' }}>{t('premiumModule').toUpperCase()}</div>
                </div>
                
                {!isTraining && trainingProgress === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>🧠</div>
                    <h4 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.75rem' }}>{t('trainAiTitle')}</h4>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 2rem' }}>
                      {t('trainAiDesc')}
                    </p>
                    <button 
                      onClick={() => {
                        setIsTraining(true);
                        const interval = setInterval(() => {
                          setTrainingProgress(prev => {
                            if (prev >= 100) {
                              clearInterval(interval);
                              setIsTraining(false);
                              return 100;
                            }
                            return prev + 5;
                          });
                        }, 200);
                      }}
                      className="action-btn" 
                      style={{ width: 'auto', padding: '1rem 2.5rem', background: 'var(--accent-color)' }}
                    >
                      {t('uploadTrainingSet')}
                    </button>
                  </div>
                )}

                {(isTraining || (trainingProgress > 0 && trainingProgress < 100)) && (
                  <div style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: '700' }}>
                      <span>{t('analyzingPatterns')}</span>
                      <span>{trainingProgress}%</span>
                    </div>
                    <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${trainingProgress}%`, height: '100%', background: 'linear-gradient(to right, #6366f1, #a855f7)', transition: 'width 0.2s linear' }}></div>
                    </div>
                    <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Check size={14} color="var(--success-color)" /> {t('dataValidated')}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Check size={14} color={trainingProgress > 40 ? 'var(--success-color)' : 'var(--text-secondary)'} /> {t('patternExtraction')}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Check size={14} color={trainingProgress > 80 ? 'var(--success-color)' : 'var(--text-secondary)'} /> {t('weightOptimization')}</div>
                    </div>
                  </div>
                )}

                {trainingProgress === 100 && !isTraining && (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ width: '60px', height: '60px', background: 'var(--success-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 0 30px rgba(34, 197, 94, 0.4)' }}>
                      <Check size={32} color="white" strokeWidth={4} />
                    </div>
                    <h4 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.5rem' }}>{t('modelOptimizationComplete')}</h4>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                      {t('aiModelUpdated', { agency: 'Elite Talent Management' })}
                    </p>
                    <button 
                      onClick={() => setTrainingProgress(0)}
                      className="status-badge" 
                      style={{ cursor: 'pointer', border: '1px solid var(--card-border)' }}
                    >
                      {t('resetTrainingEnv')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Permissions Dashboard (Phase 3) */}
        {activeTab === 'permissions' && rolePermissions[activeOperator?.role]?.permissions && (
          <PermissionsDashboard 
            t={t}
            rolePermissions={rolePermissions} 
            setRolePermissions={setRolePermissions}
            activeOperator={activeOperator}
          />
        )}

        {/* Subscription Plans (Phase 4/9) */}
        {activeTab === 'plans' && rolePermissions[activeOperator?.role]?.plans && (
          <PlansDashboard 
            t={t}
            subscriptionPlans={subscriptionPlans}
            activeMarket={activeMarket}
            setActiveMarket={setActiveMarket}
            activeOperator={activeOperator}
            currentAgency={currentAgency}
          />
        )}

        {/* Removed redundant QA Hub block */}
      </main>
      
      {/* Booking Modal */}
      {isBookingModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem', border: '1px solid var(--accent-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Calendar size={28} color="var(--accent-color)" /> {t('createBooking')}
              </h2>
              <X size={24} color="var(--text-secondary)" cursor="pointer" onClick={() => setIsBookingModalOpen(false)} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('clientAndGirl').toUpperCase()}</label>
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', display: 'flex', gap: '1rem' }}>
                   <div style={{ fontWeight: '700' }}>{selectedChat?.from || 'Unknown Client'}</div>
                   <div style={{ color: 'var(--text-secondary)' }}>→</div>
                   <div style={{ fontWeight: '700', color: 'var(--accent-color)' }}>{activeProfile?.name || '...'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('date').toUpperCase()}</label>
                  <input type="date" value={bookingDetails.date} onChange={(e) => setBookingDetails({...bookingDetails, date: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.75rem', borderRadius: '12px', color: 'white' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('time').toUpperCase()}</label>
                  <input type="time" value={bookingDetails.time} onChange={(e) => setBookingDetails({...bookingDetails, time: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.75rem', borderRadius: '12px', color: 'white' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('duration').toUpperCase()}</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['30', '60', '90', '120'].map(mins => (
                    <button key={mins} onClick={() => setBookingDetails({...bookingDetails, duration: mins})} style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', border: '1px solid', borderColor: bookingDetails.duration === mins ? 'var(--accent-color)' : 'var(--card-border)', background: bookingDetails.duration === mins ? 'rgba(59, 130, 246, 0.1)' : 'transparent', color: bookingDetails.duration === mins ? 'white' : 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer' }}>{mins}m</button>
                  ))}
                </div>
              </div>

              {bookingCollision && (
                <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error-color)', borderRadius: '12px', display: 'flex', gap: '0.75rem' }}>
                  <AlertTriangle size={20} color="var(--error-color)" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ color: 'var(--error-color)', fontWeight: '800', fontSize: '0.85rem', marginBottom: '0.25rem' }}>{t('collisionDetected').toUpperCase()}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('overlapsWith')}: <strong>{bookingCollision.title} ({bookingCollision.time})</strong></div>
                    <button 
                      onClick={() => {
                        // Simple logic for next slot: exact end of collision
                        const [h, m] = bookingCollision.time.split(' ')[0].split(':').map(Number);
                        const isPm = bookingCollision.time.includes('PM') && h !== 12;
                        const hCorrected = isPm ? h + 12 : (bookingCollision.time.includes('AM') && h === 12 ? 0 : h);
                        const dur = parseFloat(bookingCollision.duration) * 60;
                        const startTotal = hCorrected * 60 + (m || 0);
                        const endTotal = startTotal + dur;
                        const nextH = Math.floor(endTotal / 60);
                        const nextM = endTotal % 60;
                        const nextTime = `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
                        setBookingDetails({...bookingDetails, time: nextTime});
                        setBookingCollision(null);
                      }}
                      style={{ marginTop: '0.75rem', background: 'white', color: 'black', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
                    >
                      MOVE TO NEXT SLOT
                    </button>
                  </div>
                </div>
              )}

              <button 
                onClick={handleConfirmBooking}
                className="action-btn" 
                style={{ background: bookingCollision ? 'rgba(255,255,255,0.1)' : 'var(--accent-color)', color: 'white', marginTop: '1rem', opacity: bookingCollision ? 0.5 : 1 }}
                disabled={!!bookingCollision}
              >
                {t('confirmBooking').toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlays */}
      {incomingCall && (
        <div className="incoming-call-popup fade-in">
          <div className="incoming-card">
            <div className="avatar-pulse"><Phone size={32} color="white" /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-color)' }}>{t('incomingRelay')}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>{incomingCall.caller}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('targetLabel')}: <strong>{incomingCall.profileName}</strong></div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}><button onClick={() => setIncomingCall(null)} className="circle-btn decline"><X size={20} /></button><button onClick={acceptCall} className="circle-btn accept"><Check size={20} /></button></div>
          </div>
        </div>
      )}

      {activeCall && (
        <div className="call-overlay">
          <div className="call-card">
            <div className="call-avatar-container">
              <div className="call-avatar">
                <Users size={48} color="white" />
              </div>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>{activeCall.caller}</h2>
            <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem' }}>{formatTime(callTime)}</p>
            
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <button 
                onClick={() => setIsMuted(!isMuted)} 
                className={`call-btn ${isMuted ? 'muted' : ''}`}
                style={{ 
                  width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s',
                  background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)', border: isMuted ? '1px solid var(--error-color)' : '1px solid rgba(255,255,255,0.2)' 
                }}
              >
                {isMuted ? <MicOff size={24} color="var(--error-color)" /> : <Mic size={24} color="white" />}
              </button>
              
              <button onClick={endCall} className="call-btn end">
                <Phone size={24} style={{ transform: 'rotate(135deg)' }} />
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .unread-badge { margin-left: auto; background: var(--error-color); color: white; font-size: 0.7rem; font-weight: 800; min-width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 5px; }
        .avatar-circle { width: 48px; height: 48px; background: rgba(59, 130, 246, 0.1); border-radius: 50%; display: flex; alignItems: center; justifyContent: center; }
        .message-bubble-in { align-self: flex-start; max-width: 65%; background: var(--card-bg); padding: 1.5rem; border-radius: 4px 24px 24px 24px; border: 1px solid var(--card-border); }
        .message-bubble-out { align-self: flex-end; max-width: 65%; background: var(--accent-color); padding: 1.5rem; border-radius: 24px 24px 4px 24px; color: white; box-shadow: 0 10px 30px var(--accent-glow); }
        .suggestion-chip { background: rgba(255,255,255,0.05); border: 1px solid var(--card-border); color: var(--text-secondary); padding: 0.6rem 1rem; borderRadius: 12px; font-size: 0.85rem; cursor: pointer; white-space: nowrap; transition: all 0.2s; }
        .suggestion-chip:hover { background: rgba(59, 130, 246, 0.1); border-color: var(--accent-color); color: white; }
        .status-badge-small { font-size: 0.75rem; padding: 0.2rem 0.5rem; border: 1px solid var(--card-border); border-radius: 6px; display: inline-flex; }
        .hash-code { font-size: 0.8rem; color: var(--text-secondary); background: rgba(255,255,255,0.05); padding: 0.2rem 0.4rem; border-radius: 4px; }
        .dot { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); width: 6px; height: 6px; background: var(--accent-color); borderRadius: 50%; }
        .truncate-text { font-size: 0.9rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; WebkitLineClamp: 1; WebkitBoxOrient: vertical; }
        .incoming-call-popup { position: fixed; bottom: 3rem; right: 3rem; z-index: 1000; width: 400px; }
        .incoming-card { background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(20px); border: 1px solid var(--accent-color); padding: 1.5rem; border-radius: 24px; display: flex; align-items: center; gap: 1.5rem; box-shadow: 0 0 20px var(--accent-glow); }
        .avatar-pulse { width: 56px; height: 56px; background: var(--accent-color); border-radius: 16px; display: flex; align-items: center; justify-content: center; animation: ringPulse 2s infinite; }
        @keyframes ringPulse { 0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); } 70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }
        .circle-btn { width: 44px; height: 44px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .circle-btn.decline { background: var(--error-color); color: white; }
        .circle-btn.accept { background: var(--success-color); color: white; }
        
        select::-ms-expand { display: none; }
        select { -webkit-appearance: none; appearance: none; }
        
        .action-btn.active { background: rgba(239, 68, 68, 0.1) !important; color: var(--error-color) !important; border-color: var(--error-color) !important; }
        
        .toggle-switch.active { box-shadow: 0 0 10px rgba(16, 185, 129, 0.4); }
        .toggle-switch:hover { border-color: var(--accent-color) !important; }
      `}</style>
      
      {/* Floating Bug Button */}
      {!isBugReportOpen && (
        <button 
          onClick={() => setIsBugReportOpen(true)}
          style={{ 
            position: 'fixed', bottom: '2rem', right: '2rem', width: '50px', height: '50px', 
            borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 1000,
            boxShadow: '0 10px 30px rgba(239, 68, 68, 0.3)', transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
        >
          <Bug size={ 24 } color="#ef4444" />
        </button>
      )}

      {/* Bug Report Modal */}
      {isBugReportOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Bug size={24} color="#ef4444" /> {t('reportBugTitle')}
              </h2>
              <button onClick={() => setIsBugReportOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {t('bugReportSubtitle')}
            </p>

            <textarea 
              value={bugDescription}
              onChange={(e) => setBugDescription(e.target.value)}
              placeholder={t('bugPlaceholder')}
              style={{ 
                width: '100%', height: '150px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)',
                borderRadius: '12px', padding: '1rem', color: 'white', fontSize: '0.9rem', resize: 'none', marginBottom: '1.5rem',
                outline: 'none'
              }}
            />

            <button 
              onClick={() => {
                const title = encodeURIComponent(`[BUG] Issue reported by ${activeOperator?.name || 'Unknown'}`);
                const body = encodeURIComponent(`Operator: ${activeOperator?.name || 'Unknown'}\nRole: ${activeOperator?.role || 'Unknown'}\nClient: ${activeClient?.name || 'Super Admin'}\n\nDescription:\n${bugDescription}`);
                window.open(`https://github.com/Zdenekdi/nexus-sync/issues/new?title=${title}&body=${body}`, '_blank');
                setIsBugReportOpen(false);
                setBugDescription('');
              }}
              className="action-btn"
              style={{ background: 'var(--accent-color)', color: 'white', fontWeight: '800' }}
            >
              {t('reportToGithub')}
            </button>
          </div>
        </div>
      )}
      

      {/* Provision New Agency Modal */}
      {isAddAgencyModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '1rem' }}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '900' }}>{t('provisionAgency')}</h3>
              <button onClick={() => setIsAddAgencyModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.1em' }}>{t('agencyName').toUpperCase()}</label>
                <input 
                  type="text" 
                  value={newAgencyData.name} 
                  onChange={e => setNewAgencyData({...newAgencyData, name: e.target.value})}
                  placeholder="e.g. Diamond Stars UK"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.1em' }}>{t('region').toUpperCase()}</label>
                <select 
                  value={newAgencyData.region} 
                  onChange={e => setNewAgencyData({...newAgencyData, region: e.target.value})}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }}
                >
                  <option value="UK/Europe">UK/Europe</option>
                  <option value="International">International</option>
                  <option value="US/North America">US/North America</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.1em' }}>{t('subscriptionTier').toUpperCase()}</label>
                <select 
                  value={newAgencyData.tier} 
                  onChange={e => setNewAgencyData({...newAgencyData, tier: e.target.value})}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }}
                >
                  <option value="Standard">Standard</option>
                  <option value="Professional">Professional</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
              <button onClick={() => setIsAddAgencyModalOpen(false)} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid var(--card-border)', color: 'white', borderRadius: '12px', fontWeight: '700' }}>{t('cancel')}</button>
              <button onClick={addAgency} className="action-btn" style={{ flex: 1, background: 'var(--accent-color)', color: 'white', fontWeight: '800' }}>{t('provision')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditProfileModalOpen && editingProfileData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '1rem' }}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '600px', padding: '2.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '900' }}>{t('editProfile')}</h3>
              <button 
                onClick={() => {
                  setIsEditProfileModalOpen(false);
                  setEditingProfileData(null);
                }} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.1em' }}>{t('profileName').toUpperCase()}</label>
                  <input 
                    type="text" 
                    value={editingProfileData.name} 
                    onChange={e => setEditingProfileData({...editingProfileData, name: e.target.value})}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.1em' }}>{t('phoneNumber').toUpperCase()}</label>
                  <input 
                    type="text" 
                    value={editingProfileData.phoneNumber || ''} 
                    onChange={e => setEditingProfileData({...editingProfileData, phoneNumber: e.target.value})}
                    placeholder="+44 ..."
                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>{t('quickReplies').toUpperCase()}</label>
                  <button 
                    onClick={() => {
                      const newReply = { id: `q-${Date.now()}`, label: 'New Reply', text: '' };
                      setEditingProfileData({
                        ...editingProfileData,
                        quickReplies: [...(editingProfileData.quickReplies || []), newReply]
                      });
                    }}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer' }}
                  >
                    + {t('addQuickReply')}
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(editingProfileData.quickReplies || []).map((reply, index) => (
                    <div key={reply.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input 
                          type="text" 
                          placeholder={t('replyLabel')}
                          value={reply.label}
                          onChange={e => {
                            const newReplies = [...editingProfileData.quickReplies];
                            newReplies[index].label = e.target.value;
                            setEditingProfileData({ ...editingProfileData, quickReplies: newReplies });
                          }}
                          style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', padding: '0.5rem', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }}
                        />
                        <button 
                          onClick={() => {
                            const newReplies = editingProfileData.quickReplies.filter((_, i) => i !== index);
                            setEditingProfileData({ ...editingProfileData, quickReplies: newReplies });
                          }}
                          style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <textarea 
                        placeholder={t('replyText')}
                        value={reply.text}
                        onChange={e => {
                          const newReplies = [...editingProfileData.quickReplies];
                          newReplies[index].text = e.target.value;
                          setEditingProfileData({ ...editingProfileData, quickReplies: newReplies });
                        }}
                        style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', padding: '0.5rem', borderRadius: '6px', color: 'white', fontSize: '0.8rem', minHeight: '60px', resize: 'vertical' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
              <button 
                onClick={() => {
                  setIsEditProfileModalOpen(false);
                  setEditingProfileData(null);
                }} 
                style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid var(--card-border)', color: 'white', borderRadius: '12px', fontWeight: '700' }}
              >
                {t('cancel')}
              </button>
              <button onClick={handleSaveProfile} className="action-btn" style={{ flex: 1, background: 'var(--accent-color)', color: 'white', fontWeight: '800' }}>{t('saveProfileChanges')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Operator Modal */}
      {isAddOperatorModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '1rem' }}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '900' }}>{t('addTeamMember')}</h3>
              <button onClick={() => setIsAddOperatorModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.1em' }}>{t('fullName').toUpperCase()}</label>
                <input 
                  type="text" 
                  value={newOperatorData.name} 
                  onChange={e => setNewOperatorData({...newOperatorData, name: e.target.value})}
                  placeholder="e.g. John Doe"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.1em' }}>{t('emailAddress').toUpperCase()}</label>
                <input 
                  type="email" 
                  value={newOperatorData.email} 
                  onChange={e => setNewOperatorData({...newOperatorData, email: e.target.value})}
                  placeholder="operator@nexus.sync"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.1em' }}>{t('assignRole').toUpperCase()}</label>
                <select 
                  value={newOperatorData.role} 
                  onChange={e => setNewOperatorData({...newOperatorData, role: e.target.value})}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }}
                >
                  <option value="Operator">Operator</option>
                  <option value="Senior Operator">Senior Operator</option>
                  <option value="Manager">Regional Manager</option>
                  <option value="Admin">Agency Admin</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
              <button onClick={() => setIsAddOperatorModalOpen(false)} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid var(--card-border)', color: 'white', borderRadius: '12px', fontWeight: '700' }}>{t('cancel')}</button>
              <button onClick={addOperator} className="action-btn" style={{ flex: 1, background: 'var(--accent-color)', color: 'white', fontWeight: '800' }}>{t('addToTeam')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
    );
  };

  return renderContent();
}

export default App;
