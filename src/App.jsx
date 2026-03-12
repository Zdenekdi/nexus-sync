import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users, Activity, Shield, RefreshCw, ExternalLink,
  MessageSquare, LayoutDashboard, Settings, PieChart,
  Send, MoreVertical, CheckCheck, Play, Fingerprint,
  Globe, Cpu, Zap, Signal, Calendar, AlertTriangle, Clock, Search, LogOut,
  TrendingUp, DollarSign, BarChart3, Bell, Lock, Smartphone, Phone, X, Check, FileText, User, Sparkles, Building2, ChevronDown, UserCheck, UserPlus, Image, FileEdit, Link, StickyNote, Mic, MicOff, FileSearch, ShieldAlert, CreditCard
} from 'lucide-react';
import { MOCK_PROFILES, MOCK_MESSAGES, MOCK_STATS, MOCK_CALENDAR, MOCK_CHART_DATA, MOCK_SESSIONS, MOCK_AUDIT_LOG, MOCK_SMART_REPLIES, MOCK_CLIENTS, MOCK_OPERATORS, MOCK_CLIENT_DB, MOCK_AGENCIES } from './DemoData';
import { TRANSLATIONS } from './translations';

const LoginScreen = ({ onLogin, lang, setLang, t }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const user = MOCK_OPERATORS.find(op => op.email === email && op.password === password);
    if (user) {
      onLogin(user);
    } else {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)', filter: 'blur(60px)' }}></div>
      <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '450px', padding: '3rem', position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--accent-color)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 0 30px var(--accent-glow)' }}><Zap color="white" fill="white" size={32} /></div>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{t('logo')} SYNC</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('loginSubtitle')}</p>
        </div>
        <form onSubmit={handleSubmit} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.1em' }}>{t('emailLabel').toUpperCase()}</label>
            <div style={{ position: 'relative' }}>
              <User size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="operator@nexus.sync" required style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '1rem 1rem 1rem 3rem', borderRadius: '12px', color: 'white' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.1em' }}>{t('passwordLabel').toUpperCase()}</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '1rem 1rem 1rem 3rem', borderRadius: '12px', color: 'white' }} />
            </div>
          </div>
          {error && <div style={{ color: 'var(--error-color)', fontSize: '0.85rem', fontWeight: '700', textAlign: 'center' }}>{t('loginError')}</div>}
          <button type="submit" className="action-btn" style={{ background: 'var(--accent-color)', color: 'white', padding: '1.1rem', fontSize: '1rem', fontWeight: '800', boxShadow: '0 10px 25px var(--accent-glow)', marginTop: '1rem' }}>{t('loginButton')}</button>
        </form>
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '10px', border: '1px solid var(--card-border)', width: 'fit-content', margin: '2rem auto 0' }}>
          <button onClick={() => setLang('cz')} style={{ padding: '6px 12px', border: 'none', background: lang === 'cz' ? 'var(--accent-color)' : 'transparent', color: 'white', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>CZ</button>
          <button onClick={() => setLang('en')} style={{ padding: '6px 12px', border: 'none', background: lang === 'en' ? 'var(--accent-color)' : 'transparent', color: 'white', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>EN</button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [lang, setLang] = useState('cz');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('inbox');

  // Simulation Context
  const [activeClient, setActiveClient] = useState(MOCK_CLIENTS[0]);
  const [activeOperator, setActiveOperator] = useState(MOCK_OPERATORS[0]);
  const [clientNotes, setClientNotes] = useState({});

  const handleLogin = (user) => {
    setActiveOperator(user);
    const client = MOCK_CLIENTS.find(c => c.id === user.clientId);
    setActiveClient(client);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setActiveProfileId(null);
    setSelectedChatId(null);
  };

  // Real-time Assignment State (Local Simulation)
  const [profileAssignments, setProfileAssignments] = useState(MOCK_PROFILES);

  // Current Profile ID (Stable Reference)
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [selectedChatId, setSelectedChatId] = useState(null);

  const [messageValue, setMessageValue] = useState('');
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callTime, setCallTime] = useState(0);

  // Web Profiles Sync Simulation State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState({
    aw: 'synced',
    ege: 'synced',
    tpb: 'error'
  });

  // Translator & Notes State
  const [activeContextTab, setActiveContextTab] = useState('note'); // 'translator' or 'note'
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [targetLang, setTargetLang] = useState('en'); // Default target language for translator
  const [internalNote, setInternalNote] = useState('');
  const [sessionHistories, setSessionHistories] = useState({}); // Stores sent messages per chat ID
  const [showOnlyOnline, setShowOnlyOnline] = useState(false);

  // Call Mute State
  const [isMuted, setIsMuted] = useState(false);


  const t = (key) => TRANSLATIONS[lang][key] || key;

  // Filter operators based on active client
  const availableOperators = useMemo(() =>
    MOCK_OPERATORS.filter(op => op.clientId === activeClient.id),
    [activeClient.id]);

  // Profiles assigned to CURRENT operator
  const myProfiles = useMemo(() => {
    return profileAssignments.filter(profile =>
      profile.clientId === activeClient.id &&
      profile.operators.some(op => op.id === activeOperator.id && op.active)
    );
  }, [activeClient.id, activeOperator.id, profileAssignments]);

  // All Agency profiles for high-level management
  const allAgencyProfiles = useMemo(() => {
    return profileAssignments.filter(profile => profile.clientId === activeClient.id);
  }, [activeClient.id, profileAssignments]);

  const myProfileIds = useMemo(() => myProfiles.map(p => p.id), [myProfiles]);

  // Derived Active Profile Object
  const activeProfile = useMemo(() => {
    const found = allAgencyProfiles.find(p => p.id === activeProfileId);
    return found || myProfiles[0] || allAgencyProfiles[0] || null;
  }, [activeProfileId, allAgencyProfiles, myProfiles]);

  // Filter messages for current operator/model
  const filteredMessages = useMemo(() => {
    let base = MOCK_MESSAGES;

    // If it's a model, they only see their own profile's messages
    if (activeOperator.isModel) {
      // Find the profile belonging to this model (for demo, we assume Diana owns 'p-04')
      // In a real app, op.profileId would exist.
      const modelProfileId = 'p-04';
      base = base.filter(m => m.profileId === modelProfileId);
    } else if (!activeOperator.isAdmin) {
      // Standard operator sees messages from profiles they are assigned to
      base = base.filter(m => myProfileIds.includes(m.profileId));
    }

    return base.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [activeOperator, myProfileIds]);

  const totalUnread = useMemo(() =>
    MOCK_MESSAGES.filter(msg =>
      (activeOperator.isModel ? msg.profileId === 'p-04' : myProfileIds.includes(msg.profileId)) &&
      msg.status === 'unread'
    ).length,
    [myProfileIds, activeOperator]);

  const toggleOperatorStatus = (profileId, operatorId) => {
    setProfileAssignments(prev => prev.map(p => {
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

  const getUnreadForProfile = (profileId) => {
    return MOCK_MESSAGES.filter(msg => msg.profileId === profileId && msg.status === 'unread').length;
  };

  const selectedChat = useMemo(() => {
    if (selectedChatId) return filteredMessages.find(m => m.id === selectedChatId);
    return filteredMessages[0] || null;
  }, [selectedChatId, filteredMessages]);

  // Combine selectedChat with its client info for easier access
  const activeChat = useMemo(() => {
    if (!selectedChat) return null;
    const profile = allAgencyProfiles.find(p => p.id === selectedChat.profileId);
    const client = MOCK_CLIENTS.find(c => c.id === profile?.clientId);
    return { ...selectedChat, client };
  }, [selectedChat, allAgencyProfiles]);

  useEffect(() => {
    let timer;
    if (activeCall?.status === 'active') {
      timer = setInterval(() => {
        setCallTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
      if (!activeCall) setCallTime(0);
    };
  }, [activeCall]);

  // No side effects needed for chat change now that resets are in onClick handlers.

  const handleSendMessage = useCallback((val = messageValue) => {
    if (!val.trim() || !selectedChat?.id) return;
    const now = Date.now();
    const newMessage = { 
      id: now, 
      text: val, 
      from: 'me', 
      time: 'Just now', 
      translated: activeClient.lang !== activeOperator.lang ? activeClient.lang : null 
    };
    
    setSessionHistories(prev => ({
      ...prev,
      [selectedChat.id]: [...(prev[selectedChat.id] || []), newMessage]
    }));
    
    setMessageValue('');
  }, [messageValue, selectedChat, activeClient.lang, activeOperator.lang]);

  const startCall = () => {
    if (!activeProfile) return;
    setActiveCall({ status: 'connecting', startTime: Date.now(), caller: selectedChat?.from || activeProfile.name });
    setTimeout(() => {
      setActiveCall({ status: 'active', startTime: Date.now(), caller: selectedChat?.from || activeProfile.name });
    }, 2000);
  };

  const simulateIncomingCall = () => {
    if (!activeProfile) return;
    setIncomingCall({
      caller: '+44 7700 900555',
      profileId: activeProfile.id,
      profileName: activeProfile.name
    });
  };

  const acceptCall = () => {
    const caller = incomingCall.caller;
    setIncomingCall(null);
    setActiveCall({ status: 'active', startTime: Date.now(), caller });
  };

  const endCall = () => setActiveCall(null);
  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const handleSyncAll = () => {
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncStatus({ aw: 'syncing', ege: 'syncing', tpb: 'syncing' });

    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setSyncProgress(progress);
      if (progress === 40) setSyncStatus(prev => ({ ...prev, aw: 'synced' }));
      if (progress === 75) setSyncStatus(prev => ({ ...prev, tpb: 'synced' }));
      if (progress >= 100) {
        clearInterval(interval);
        setIsSyncing(false);
        setSyncStatus({ aw: 'synced', ege: 'synced', tpb: 'synced' });
      }
    }, 150);
  };

  const getSmartReplies = (chatText, appLang) => {
    if (!chatText) return [];
    const lowerText = chatText.toLowerCase();
    if (lowerText.includes('tomorrow') || lowerText.includes('zítra')) {
      return appLang === 'cz' ? ["Zítra mám čas od 14:00.", "Zítřek je plný, co takhle pozítří?", "Ano, zítra se můžeme vidět."] : ["I'm free from 2 PM tomorrow.", "Tomorrow is fully booked, how about the day after?", "Yes, we can meet tomorrow."];
    }
    if (lowerText.includes('rate') || lowerText.includes('cena')) {
      return appLang === 'cz' ? ["Moje sazba je £200/h.", "Nabízím i delší schůzky za zvýhodněnou cenu.", "Můžeme se dohodnout, napiš mi víc."] : ["My rate is £200/h.", "I also offer longer bookings at a discount.", "We can discuss it."];
    }
    if (lowerText.includes('tonight') || lowerText.includes('dnes')) {
      return appLang === 'cz' ? ["Dnes večer mám volno od 20:00.", "Dnešek mám bohužel už plný.", "Zavoláš mi a domluvíme se?"] : ["I'm free tonight from 8 PM.", "I'm fully booked for tonight, sorry.", "Can you call me to arrange?"];
    }
    return appLang === 'cz' ? ["Ahoj! Jsem tu, hodil by se ti čas v 16:00?", "Ráda si popovídám víc. Zavoláš mi?"] : ["Hey! I'm around, would 4pm work?", "I'd love to chat more. Call me?"];
  };

  const currentSmartReplies = useMemo(() => {
    return selectedChat ? getSmartReplies(selectedChat.text, lang) : [];
  }, [selectedChat, lang]);

  const handleTranslate = () => {
    if (!sourceText.trim()) {
      setTranslatedText('');
      return;
    }
    setIsTranslating(true);
    // Simulate API call
    setTimeout(() => {
      const mockTranslations = {
        'en': {
          'hello': 'Ahoj', 'how are you': 'Jak se máš?', 'good morning': 'Dobré ráno',
          'i am free from 2 pm tomorrow': 'Zítra mám volno od 14:00',
          'my rate is £200/h': 'Moje sazba je £200/h',
          'i am free tonight from 8 pm': 'Dnes večer mám volno od 20:00'
        },
        'cz': {
          'ahoj': 'Hello', 'jak se máš?': 'How are you?', 'dobré ráno': 'Good morning',
          'zítra mám volno od 14:00': 'I am free from 2 PM tomorrow',
          'moje sazba je £200/h': 'My rate is £200/h',
          'dnes večer mám volno od 20:00': 'I am free tonight from 8 PM'
        }
      };
      const lowerSource = sourceText.toLowerCase();
      const translated = mockTranslations[targetLang]?.[lowerSource] || `[Translated to ${targetLang.toUpperCase()}: ${sourceText}]`;
      setTranslatedText(translated);
      setIsTranslating(false);
    }, 700);
  };

  // Handle Note Save
  const handleSaveNote = () => {
    if (!internalNote.trim() || !activeChat?.from) return;

    const newNote = {
      id: Date.now(),
      text: internalNote,
      author: activeOperator?.name || "Operator",
      timestamp: new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    setClientNotes(prev => ({
      ...prev,
      [activeChat.from]: [newNote, ...(prev[activeChat.from] || [])]
    }));
    setInternalNote('');
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} lang={lang} setLang={setLang} t={t} />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-primary)', position: 'relative' }}>

      {/* Simulation Toolbar (Footer Fix) */}
      <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(5,7,10,0.8)', backdropFilter: 'blur(20px)', padding: '0.75rem 2rem', borderRadius: '50px', border: '1px solid var(--accent-color)', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '2rem', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-color)', letterSpacing: '0.1em' }}>DEMO SIMULATION CONTROLS:</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={14} color="var(--text-secondary)" />
            <select
              value={activeClient.id}
              onChange={(e) => {
                const client = MOCK_CLIENTS.find(c => c.id === e.target.value);
                setActiveClient(client);
                const firstOp = MOCK_OPERATORS.find(op => op.clientId === client.id);
                setActiveOperator(firstOp);
                setActiveProfileId(null);
                setSelectedChatId(null);
              }}
              style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.8rem', fontWeight: '700', outline: 'none' }}
            >
              {MOCK_CLIENTS.map(c => <option key={c.id} value={c.id} style={{ background: '#0a0a0a' }}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ width: '1px', height: '20px', background: 'var(--card-border)' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={14} color="var(--accent-color)" />
            <select
              value={activeOperator.id}
              onChange={(e) => {
                const op = MOCK_OPERATORS.find(o => o.id === e.target.value);
                setActiveOperator(op);
                setActiveProfileId(null);
                setSelectedChatId(null);
              }}
              style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.8rem', fontWeight: '700', outline: 'none' }}
            >
              {availableOperators.map(o => <option key={o.id} value={o.id} style={{ background: '#0a0a0a' }}>{o.name}</option>)}
            </select>
          </div>
          {!activeOperator.isAdmin && (
            <>
              <div style={{ height: '32px', width: '1px', background: 'var(--card-border)' }} />
              <button
                onClick={simulateIncomingCall}
                className="status-badge pulse-call-btn"
                style={{ cursor: 'pointer', border: 'none', color: 'var(--accent-color)' }}
              >
                <Phone size={16} />
                <span style={{ fontWeight: '700' }}>{t('simulateCall')}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <nav style={{
        width: '280px',
        borderRight: '1px solid var(--card-border)',
        padding: '2rem 1.5rem',
        background: 'rgba(5, 7, 10, 0.4)',
        backdropFilter: 'blur(30px)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 10
      }}>
        <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '42px', height: '42px', background: 'var(--accent-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px var(--accent-glow)' }}>
              <Zap color="white" fill="white" size={22} />
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: '900', letterSpacing: '0.05em' }}>{t('logo')}</span>
          </div>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
            <button onClick={() => setLang('cz')} style={{ padding: '4px 8px', border: 'none', background: lang === 'cz' ? 'var(--accent-color)' : 'transparent', color: 'white', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer' }}>CZ</button>
            <button onClick={() => setLang('en')} style={{ padding: '4px 8px', border: 'none', background: lang === 'en' ? 'var(--accent-color)' : 'transparent', color: 'white', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer' }}>EN</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            // Operational Tabs (Now visible to Admins/Managers too so they can see Inbox/Notes)
            { id: 'inbox', icon: MessageSquare, label: t('messages'), badge: activeOperator.isModel ? 0 : totalUnread },
            { id: 'calendar', icon: Calendar, label: t('schedule') },
            ...(activeOperator.isModel ? [] : [
              { id: 'profiles', icon: Users, label: t('profiles') },
              { id: 'web-profiles', icon: Globe, label: t('webProfiles') }
            ]),
            // Manager Tabs
            ...(activeOperator.isAdmin ? [
              { id: 'analytics', icon: BarChart3, label: t('analytics') },
              { id: 'qa', icon: FileSearch, label: 'QA & Review' }
            ] : []),
            // Universal Tabs (except Models don't need Audit Log here)
            ...(activeOperator.isModel ? [] : [{ id: 'activity', icon: Activity, label: t('auditLog') }]),
            ...(activeOperator.isSuperAdmin ? [{ id: 'super-admin', icon: ShieldAlert, label: 'Super Admin' }] : []),
            { id: 'settings', icon: Settings, label: t('settings') },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1rem', border: 'none', borderRadius: '12px',
                background: activeTab === item.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.2s ease'
              }}
            >
              <item.icon size={20} color={activeTab === item.id ? 'var(--accent-color)' : 'var(--text-secondary)'} />
              <span style={{ color: activeTab === item.id ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === item.id ? '700' : '500', fontSize: '1rem' }}>{item.label}</span>
              {item.badge > 0 && <div className="unread-badge">{item.badge}</div>}
            </button>
          ))}
        </div>

        {/* Profile (Girl) Switcher - Hidden ONLY for Models (Visible for Operators and Admins) */}
        {!activeOperator.isModel && (
          <div style={{ marginTop: '2.5rem', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>MY ASSIGNED GIRLS</div>
              <button 
                onClick={() => setShowOnlyOnline(!showOnlyOnline)}
                style={{ 
                  background: showOnlyOnline ? 'var(--success-color)' : 'transparent', 
                  color: showOnlyOnline ? 'white' : 'var(--text-secondary)', 
                  fontSize: '0.7rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '6px 12px', borderRadius: '8px', border: '2px solid currentColor',
                  boxShadow: showOnlyOnline ? '0 0 15px rgba(16, 185, 129, 0.3)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                {showOnlyOnline ? 'ONLINE ONLY' : 'SHOW ALL'}
              </button>
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

        <div style={{ marginTop: 'auto', marginBottom: '4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: 'var(--error-color)', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <LogOut size={16} /> {t('logout')}
          </button>
          <div className="glass-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderColor: 'var(--card-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: 'var(--accent-color)', fontSize: '0.75rem' }}>{activeOperator.avatar}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeOperator.name}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{activeOperator.role}</div>
              </div>
              <div style={{ width: '8px', height: '8px', background: 'var(--success-color)', borderRadius: '50%' }}></div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
        {activeTab === 'inbox' && (
          <div style={{ display: 'flex', flex: 1, height: '100%' }} className="fade-in">
            <div style={{ width: '380px', borderRight: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column' }}>
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
                    if (!isTranslating) {
                      setSourceText("");
                      setTranslatedText("");
                    }
                    setInternalNote("");
                    // Initialize client notes entry if missing
                    if (msg.from && !clientNotes[msg.from]) {
                      setClientNotes(prev => ({ ...prev, [msg.from]: [] }));
                    }
                  }}
                    style={{ padding: '1.5rem', borderBottom: '1px solid var(--card-border)', background: selectedChat?.id === msg.id ? 'rgba(59, 130, 246, 0.05)' : 'transparent', cursor: 'pointer', position: 'relative' }}>
                    {msg.status === 'unread' && <div className="dot"></div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}><span style={{ fontWeight: '700', fontSize: '1.1rem' }}>{msg.from}</span><span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{msg.time}</span></div>
                    <div className="truncate-text">{msg.text}</div>
                  </div>
                )) : <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('noMessages')}</div>}
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'row' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)' }}>
                {selectedChat ? (
                  <>
                    <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><div className="avatar-circle"><Users color="var(--accent-color)" size={24} /></div><div><div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{selectedChat.from}</div><div style={{ fontSize: '0.8rem', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Shield size={12} /> {t('secureConnection')}</div></div></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><button onClick={startCall} className="status-badge pulse-call-btn" style={{ fontWeight: '700', color: 'var(--accent-color)', cursor: 'pointer' }}><Signal size={16} /> {t('voiceCall')}</button><MoreVertical size={22} color="var(--text-secondary)" cursor="pointer" /></div>
                    </div>

                    <div style={{ flex: 1, padding: '2.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <div className="message-bubble-in">{selectedChat.text}</div>
                      {(sessionHistories[selectedChat.id] || []).map(m => (
                        <div key={m.id} style={{ alignSelf: 'flex-end', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <div className="message-bubble-out">{m.text}</div>
                          {m.translated && (
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Globe size={10} color="var(--text-secondary)" /> {t('translatedTo')} {m.translated.toUpperCase()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div style={{ padding: '1.5rem 2rem', background: 'rgba(5,7,10,0.4)', borderTop: '1px solid var(--card-border)', marginBottom: '4rem' }}>
                      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-color)', fontSize: '0.75rem', fontWeight: '800', borderRight: '1px solid var(--card-border)', paddingRight: '1rem', whiteSpace: 'nowrap' }}><Sparkles size={14} /> {t('aiSuggestions')}</div>
                        {currentSmartReplies.map((replyText, idx) => (
                          <button key={idx} onClick={() => handleSendMessage(replyText)} className="suggestion-chip">{replyText}</button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '1.25rem' }}>
                        <input type="text" value={messageValue} onChange={(e) => setMessageValue(e.target.value)} placeholder={t('typeResponse')} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '1.25rem', borderRadius: '16px', color: 'white' }} />
                        <button onClick={() => handleSendMessage()} style={{ background: 'var(--accent-color)', border: 'none', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 5px 15px var(--accent-glow)' }}><Send size={24} color="white" /></button>
                      </div>
                    </div>
                  </>
                ) : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ textAlign: 'center' }}><MessageSquare size={64} style={{ marginBottom: '1.5rem', opacity: 0.2 }} /><h3>Select a conversation</h3></div></div>}
              </div>

              {selectedChat && (
                <div className="notes-panel-container" style={{ width: '400px', borderLeft: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
                    
                    {/* Tabs for Translator / Note */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--card-border)', background: 'rgba(255, 255, 255, 0.02)' }}>
                      <button
                        onClick={() => setActiveContextTab('translator')}
                        style={{
                          flex: 1, padding: '0.75rem', border: 'none', background: 'transparent',
                          color: activeContextTab === 'translator' ? 'var(--accent-color)' : 'var(--text-secondary)',
                          borderBottom: activeContextTab === 'translator' ? '2px solid var(--accent-color)' : '2px solid transparent',
                          fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                        }}
                      >
                        <Globe size={14} /> Translator
                      </button>
                      <button
                        onClick={() => setActiveContextTab('note')}
                        style={{
                          flex: 1, padding: '0.75rem', border: 'none', background: 'transparent',
                          color: activeContextTab === 'note' ? '#f59e0b' : 'var(--text-secondary)',
                          borderBottom: activeContextTab === 'note' ? '2px solid #f59e0b' : '2px solid transparent',
                          fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                        }}
                      >
                        <StickyNote size={14} /> Internal Note
                      </button>
                    </div>

                    {/* Stable Content Area */}
                    <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }} className="custom-scrollbar">
                      {activeContextTab === 'translator' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <textarea
                            value={sourceText}
                            onChange={(e) => setSourceText(e.target.value)}
                            placeholder="Type text to translate..."
                            style={{
                              width: '100%', height: '100px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--card-border)',
                              borderRadius: '12px', padding: '1rem', color: 'white', resize: 'none', fontSize: '0.9rem'
                            }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <select
                              value={targetLang}
                              onChange={(e) => setTargetLang(e.target.value)}
                              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', outline: 'none' }}
                            >
                              <option value="en" style={{ background: '#0a0a0a' }}>TO ENGLISH</option>
                              <option value="cz" style={{ background: '#0a0a0a' }}>TO CZECH</option>
                            </select>
                            <button
                              onClick={handleTranslate}
                              disabled={isTranslating}
                              style={{ background: 'var(--accent-color)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                              {isTranslating ? <RefreshCw size={14} className="spin-animation" /> : <Sparkles size={14} />}
                              Translate
                            </button>
                          </div>
                          {translatedText && (
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px', padding: '1rem', position: 'relative' }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-color)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>TRANSLATED:</div>
                              <div style={{ fontSize: '0.95rem', color: 'white' }}>{translatedText}</div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                          <textarea
                            value={internalNote}
                            onChange={(e) => setInternalNote(e.target.value)}
                            placeholder="Add a new internal note for this client..."
                            style={{
                              width: '100%', minHeight: '100px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)',
                              borderRadius: '12px', padding: '1rem', color: '#f59e0b', resize: 'vertical', fontSize: '0.9rem'
                            }}
                          />
                          <button
                            onClick={handleSaveNote}
                            disabled={!internalNote.trim()}
                            style={{
                              alignSelf: 'flex-end', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)',
                              padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', cursor: internalNote.trim() ? 'pointer' : 'not-allowed',
                              transition: 'all 0.2s'
                            }}
                          >
                            Save Note
                          </button>
                          
                          {/* Saved Notes List */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                            {activeChat?.from && (clientNotes[activeChat.from] || []).map(note => (
                              <div key={note.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', borderLeft: '3px solid #f59e0b' }}>
                                <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)', marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>{note.text}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                  <span>{note.author}</span>
                                  <span>{note.timestamp}</span>
                                </div>
                              </div>
                            ))}
                            {(!activeChat?.from || !clientNotes[activeChat.from] || clientNotes[activeChat.from].length === 0) && (
                              <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '2rem 0' }}>
                                No internal notes saved yet.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'web-profiles' && (
          <div style={{ padding: '3rem', paddingBottom: '8rem', flex: 1, display: 'flex', gap: '2rem' }} className="fade-in">
            {/* Left Content Area (Gallery & Bio) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: '800' }}>{t('webProfiles')} - {activeProfile?.name || '...'}</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Zde můžete upravovat texty a fotky, které se následně rozešlou na připojené inzertní weby.</p>
              </div>

              <div className="glass-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Image size={20} color="var(--accent-color)" /> {t('gallery')}</h3>
                  <button className="action-btn" style={{ width: 'auto', padding: '0.5rem 1rem', marginTop: 0, fontSize: '0.8rem' }}>+ {t('uploadPhoto')}</button>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-secondary)' }}>{t('publicGallery').toUpperCase()}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem' }}>
                      <div className="placeholder-img" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200)' }}></div>
                      <div className="placeholder-img" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=200)' }}></div>
                      <div className="placeholder-img" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200)' }}></div>
                    </div>
                  </div>
                  <div style={{ width: '1px', background: 'var(--card-border)' }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-secondary)' }}>{t('privateGallery').toUpperCase()} (VIP)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem' }}>
                      <div className="placeholder-img" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200)' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileEdit size={20} color="var(--accent-color)" /> {t('biography')} & {t('services')}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button style={{ padding: '4px 8px', border: '1px solid var(--accent-color)', background: 'rgba(59, 130, 246, 0.2)', color: 'white', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700' }}>EN</button>
                    <button style={{ padding: '4px 8px', border: '1px solid var(--card-border)', background: 'transparent', color: 'var(--text-secondary)', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700' }}>CZ</button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Motto / Headline</label>
                    <input type="text" defaultValue={activeProfile?.bio || ''} className="note-input" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Full Biography</label>
                    <textarea className="note-input" style={{ height: '150px' }} defaultValue="Hi, I am available in the city center. VIP companion offering GFE, outcalls and incalls. Very friendly and open minded..."></textarea>
                  </div>
                  <button className="action-btn" style={{ width: 'fit-content' }}>{t('saveChanges')}</button>
                </div>
              </div>
            </div>

            {/* Right Sync Area */}
            <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="glass-card" style={{ padding: '2rem', background: 'rgba(5,7,10,0.6)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}><RefreshCw size={20} color="var(--success-color)" className={isSyncing ? "spin-animation" : ""} /> {t('syncStatus')}</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                  <div className="sync-platform-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="platform-icon">AW</div>
                      <div><div style={{ fontWeight: '700', fontSize: '0.9rem' }}>AdultWork.com</div><div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>UK Primary</div></div>
                    </div>
                    <div className={`sync-badge ${syncStatus.aw}`}>
                      {syncStatus.aw === 'syncing' ? <RefreshCw size={12} className="spin-animation" /> : (syncStatus.aw === 'synced' ? <Check size={12} /> : <X size={12} />)}
                      {syncStatus.aw.toUpperCase()}
                    </div>
                  </div>

                  <div className="sync-platform-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="platform-icon">EG</div>
                      <div><div style={{ fontWeight: '700', fontSize: '0.9rem' }}>EuroGirlsEscort</div><div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>EU Wide</div></div>
                    </div>
                    <div className={`sync-badge ${syncStatus.ege}`}>
                      {syncStatus.ege === 'syncing' ? <RefreshCw size={12} className="spin-animation" /> : (syncStatus.ege === 'synced' ? <Check size={12} /> : <X size={12} />)}
                      {syncStatus.ege.toUpperCase()}
                    </div>
                  </div>

                  <div className="sync-platform-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="platform-icon">TP</div>
                      <div><div style={{ fontWeight: '700', fontSize: '0.9rem' }}>ThePuntersB...</div><div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Review sync</div></div>
                    </div>
                    <div className={`sync-badge ${syncStatus.tpb}`}>
                      {syncStatus.tpb === 'syncing' ? <RefreshCw size={12} className="spin-animation" /> : (syncStatus.tpb === 'synced' ? <Check size={12} /> : <AlertTriangle size={12} />)}
                      {syncStatus.tpb.toUpperCase()}
                    </div>
                  </div>
                </div>

                {isSyncing ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: '700' }}><span>Syncing Profile Data...</span><span>{syncProgress}%</span></div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${syncProgress}%`, height: '100%', background: 'var(--accent-color)', transition: 'width 0.2s ease' }}></div>
                    </div>
                  </div>
                ) : (
                  <button onClick={handleSyncAll} className="action-btn" style={{ background: 'var(--success-color)', boxShadow: '0 5px 15px rgba(16, 185, 129, 0.3)' }}><RefreshCw size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} /> {t('syncAll')}</button>
                )}

                <div style={{ marginTop: '1.5rem', fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px' }}>
                  <Link size={14} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                  Systém naváže spojení přes proxy bránu uk-london-res-12 a simuluje reálný prohlížeč pro aktualizaci dat bez rizika banu za scrapování.
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && activeOperator.isAdmin && (
          <div style={{ padding: '3rem', paddingBottom: '8rem', flex: 1 }} className="fade-in">
            <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '2.5rem' }}>{t('agencyOverview')}</h2>
            
            {/* Top Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  <DollarSign size={20} color="var(--success-color)" />
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.05em' }}>{t('totalRevenue').toUpperCase()}</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '900' }}>£15,490</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--success-color)', marginTop: '0.5rem', fontWeight: '700' }}>+12.4% vs last week</div>
              </div>
              
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  <Calendar size={20} color="var(--accent-color)" />
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.05em' }}>{t('activeBookings').toUpperCase()}</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '900' }}>89</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--success-color)', marginTop: '0.5rem', fontWeight: '700' }}>+5 this week</div>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  <MessageSquare size={20} color="#a855f7" />
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.05em' }}>{t('totalMessages').toUpperCase()}</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '900' }}>2,148</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Across all profiles</div>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  <TrendingUp size={20} color="#f59e0b" />
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.05em' }}>{t('conversionRate').toUpperCase()}</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '900' }}>11.5%</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--success-color)', marginTop: '0.5rem', fontWeight: '700' }}>+1.2% trend</div>
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
                          <td style={{ padding: '1rem' }}><div className="status-badge-small" style={{ borderColor: 'var(--success-color)', color: 'var(--success-color)' }}>Top {p.rank}</div></td>
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
          <div style={{ padding: '3rem', paddingBottom: '8rem' }} className="fade-in">
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
                          {activeCount > 0 ? `${activeCount} OPERATORS ACTIVE` : 'NO COVERAGE'}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleOperatorStatus(profile.id, activeOperator.id)}
                        className={`action-btn ${isMyProfile ? 'active' : ''}`}
                        style={{ background: isMyProfile ? 'rgba(239, 68, 68, 0.2)' : 'var(--accent-color)', color: isMyProfile ? 'var(--error-color)' : 'white' }}
                      >
                        {isMyProfile ? 'DEACTIVATE MY SEAT' : 'ACTIVATE MY SEAT'}
                      </button>
                      <button
                        onClick={() => {
                          setActiveProfileId(profile.id);
                          setActiveTab('inbox');
                        }}
                        style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'transparent', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                      >
                        OPEN CONTEXT
                      </button>

                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '1rem', letterSpacing: '0.05em' }}>ASSIGNED TEAM:</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                        {profile.operators.map(profileOp => {
                          const opData = MOCK_OPERATORS.find(o => o.id === profileOp.id);
                          return (
                            <div key={profileOp.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '15px', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: '1rem', opacity: profileOp.active ? 1 : 0.4 }}>
                              <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '900' }}>{opData.avatar}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{opData.name}</div>
                                <div style={{ fontSize: '0.65rem', color: profileOp.primary ? 'var(--accent-color)' : 'var(--text-secondary)' }}>{profileOp.primary ? 'Primary' : 'Support'}</div>
                              </div>
                              {profileOp.active && <UserCheck size={16} color="var(--success-color)" />}
                            </div>
                          );
                        })}
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', borderRadius: '15px', border: '1px dashed var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                          <UserPlus size={16} /> <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>Add</span>
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
          <div style={{ padding: '3rem', paddingBottom: '8rem' }} className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
              <div><h2 style={{ fontSize: '2rem', fontWeight: '800' }}>{t('auditTrail')} - {activeClient.name}</h2><p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{t('auditSubtitle')}</p></div>
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
          <div style={{ padding: '3rem', paddingBottom: '8rem' }} className="fade-in">
            <h2 style={{ fontSize: '2rem', fontWeight: '800' }}>{t('controlCenter')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem' }}>{t('configSubtitle')}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', maxWidth: '800px' }}>
              <div className="settings-section">
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Building2 size={20} color="var(--accent-color)" /> Agency Insight: {activeClient.name}</h3>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800', marginBottom: '0.5rem' }}>TEAM SEATS</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{availableOperators.length} / 10</div>
                  </div>
                  <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800', marginBottom: '0.5rem' }}>REGIONAL REACH</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{activeClient.region}</div>
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

              <div className="settings-section">
                <h3 style={{ marginBottom: '1.5rem' }}>{t('simulationTools')}</h3>
                <button onClick={simulateIncomingCall} className="action-btn" style={{ maxWidth: '300px' }}><Phone size={16} /> {t('simulateCall')}</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'super-admin' && activeOperator.isSuperAdmin && (
          <div style={{ padding: '3rem', paddingBottom: '8rem' }} className="fade-in">
            <h2 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '1rem', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Super Admin Infrastructure</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1.1rem' }}>Global management of agencies, subscriptions, and system-wide capabilities.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
              {/* Stats Overview */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                {[
                  { label: 'TOTAL AGENCIES', value: MOCK_AGENCIES.length, icon: Building2, color: '#3b82f6' },
                  { label: 'ACTIVE PROFILES', value: MOCK_PROFILES.length, icon: Users, color: '#8b5cf6' },
                  { label: 'MONTHLY REVENUE', value: '$12,450', icon: CreditCard, color: '#10b981' },
                  { label: 'SYSTEM UPTIME', value: '99.98%', icon: Activity, color: '#f59e0b' }
                ].map((stat, i) => (
                  <div key={i} className="glass-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div style={{ background: `${stat.color}20`, padding: '0.5rem', borderRadius: '10px' }}>
                        <stat.icon size={20} color={stat.color} />
                      </div>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: '800', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{stat.label}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Agency & Subscription Management */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building2 size={24} color="var(--accent-color)" /> Agency & Subscription Manager
                  </h3>
                  <button className="action-btn" style={{ width: 'auto', padding: '0.6rem 1.25rem' }}><Plus size={18} /> Add New Agency</button>
                </div>
                
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--card-border)' }}>
                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800' }}>AGENCY NAME</th>
                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800' }}>STATUS</th>
                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800' }}>PLAN</th>
                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800' }}>BILLING</th>
                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800' }}>FEATURES</th>
                        <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_AGENCIES.map((agency, i) => (
                        <tr key={agency.id} style={{ borderBottom: i < MOCK_AGENCIES.length - 1 ? '1px solid var(--card-border)' : 'none' }}>
                          <td style={{ padding: '1.25rem 1.5rem' }}>
                            <div style={{ fontWeight: '700', fontSize: '1rem' }}>{agency.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Region: {agency.region}</div>
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
                          <td style={{ padding: '1.25rem 1.5rem', fontWeight: '700', fontSize: '0.9rem' }}>{agency.subscription.plan}</td>
                          <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem' }}>
                            <div>Next: {agency.subscription.endDate}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>$499.00 USD</div>
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <Shield size={16} color={agency.features.analytics ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)'} strokeWidth={3} />
                              <Users size={16} color={agency.features.multiUser ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)'} strokeWidth={3} />
                              <Layout size={16} color={agency.features.customReports ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)'} strokeWidth={3} />
                            </div>
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem' }}>
                            <button className="status-badge" style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: 'white' }}>Manage</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* System Capabilities / Feature Toggles */}
              <div className="glass-card" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldAlert size={24} color="#f59e0b" /> Global Feature Provisioning
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
                  {[
                    { id: 'ai_trans', label: 'AI Real-time Translation', desc: 'Auto-translate messages for all supported agencies.', active: true },
                    { id: 'vc_hub', label: 'Voice Hub & Call Simulation', desc: 'Enable voice call infrastructure and overlays.', active: true },
                    { id: 'crm_adv', label: 'Advanced CRM & Client Notes', desc: 'Persistent client interactions and internal operator logs.', active: true },
                    { id: 'stats_bi', label: 'BI Analytics & Performance', desc: 'Enterprise-level statistics and operator metrics.', active: false }
                  ].map((feature, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '15px', border: '1px solid var(--card-border)' }}>
                      <div>
                        <div style={{ fontWeight: '700', marginBottom: '0.25rem' }}>{feature.label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{feature.desc}</div>
                      </div>
                      <div style={{ 
                        width: '44px', height: '24px', background: feature.active ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
                        borderRadius: '20px', position: 'relative', cursor: 'pointer', transition: 'all 0.3s'
                      }}>
                        <div style={{ 
                          width: '18px', height: '18px', background: 'white', borderRadius: '50%',
                          position: 'absolute', top: '3px', left: feature.active ? '23px' : '3px', transition: 'all 0.3s'
                        }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'qa' && activeOperator.isAdmin && (
          <div style={{ padding: '3rem', height: '100%', overflowY: 'auto' }} className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <FileSearch size={28} color="var(--accent-color)" /> QA & Quality Review
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Review agency-wide client notes and interactions.</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {MOCK_MESSAGES.reduce((acc, msg) => {
                if (!acc.find(m => m.from === msg.from)) acc.push(msg);
                return acc;
              }, []).map(clientMsg => (
                <div key={clientMsg.from} className="glass-card" style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.2rem' }}>
                        {clientMsg.from.slice(-2)}
                      </div>
                      <div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>{clientMsg.from}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Client History</div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 style={{ fontSize: '0.9rem', color: '#f59e0b', marginBottom: '1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <StickyNote size={16} /> INTERNAL NOTES LOG
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {(clientNotes[clientMsg.from] || []).map(note => (
                        <div key={note.id} style={{ background: 'rgba(245, 158, 11, 0.05)', borderLeft: '4px solid #f59e0b', padding: '1rem', borderRadius: '0 12px 12px 0' }}>
                          <div style={{ fontSize: '1rem', color: 'white', marginBottom: '0.75rem', lineHeight: '1.5' }}>{note.text}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <span>Logged by: <strong style={{ color: 'white' }}>{note.author}</strong></span>
                            <span>{note.timestamp}</span>
                          </div>
                        </div>
                      ))}
                      {(!clientNotes[clientMsg.from] || clientNotes[clientMsg.from].length === 0) && (
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '1rem' }}>No notes found for this client.</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

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
      `}</style>
    </div>
  );
}

export default App;
