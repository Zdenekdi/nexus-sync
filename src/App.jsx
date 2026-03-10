import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Activity, Shield, RefreshCw, ExternalLink,
  MessageSquare, LayoutDashboard, Settings, PieChart,
  Send, MoreVertical, CheckCheck, Play, Fingerprint,
  Globe, Cpu, Zap, Signal, Calendar, AlertTriangle, Clock, Search, LogOut,
  TrendingUp, DollarSign, BarChart3, Bell, Lock, Smartphone, Phone, X, Check, FileText, User, Sparkles, Building2, ChevronDown, UserCheck, UserPlus
} from 'lucide-react';
import { MOCK_PROFILES, MOCK_MESSAGES, MOCK_STATS, MOCK_CALENDAR, MOCK_CHART_DATA, MOCK_SESSIONS, MOCK_AUDIT_LOG, MOCK_SMART_REPLIES, MOCK_CLIENTS, MOCK_OPERATORS } from './DemoData';
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
  const [sentMessages, setSentMessages] = useState([]);
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callTime, setCallTime] = useState(0);

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

  // Derived Active Profile Object
  const activeProfile = useMemo(() => {
    const found = allAgencyProfiles.find(p => p.id === activeProfileId);
    return found || myProfiles[0] || allAgencyProfiles[0] || null;
  }, [activeProfileId, allAgencyProfiles, myProfiles]);

  const filteredMessages = useMemo(() =>
    activeProfile ? MOCK_MESSAGES.filter(msg => msg.profileId === activeProfile.id) : [],
    [activeProfile]);

  const totalUnread = useMemo(() =>
    MOCK_MESSAGES.filter(msg =>
      msg.status === 'unread' &&
      myProfiles.some(p => p.id === msg.profileId)
    ).length,
    [myProfiles]);

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

  const handleSendMessage = (text = messageValue) => {
    if (!text.trim()) return;
    setSentMessages(prev => [...prev, { id: Date.now(), text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setMessageValue('');
  };

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
            { id: 'inbox', icon: MessageSquare, label: t('messages'), badge: totalUnread },
            { id: 'calendar', icon: Calendar, label: t('schedule') },
            { id: 'profiles', icon: Users, label: t('profiles') },
            { id: 'activity', icon: Activity, label: t('auditLog') },
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

        {/* Profile (Girl) Switcher */}
        <div style={{ marginTop: '2.5rem', flex: 1 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '1rem', letterSpacing: '0.1em' }}>MY ASSIGNED GIRLS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {myProfiles.map(p => {
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
                  <div key={msg.id} onClick={() => { setSelectedChatId(msg.id); setSentMessages([]); }}
                    style={{ padding: '1.5rem', borderBottom: '1px solid var(--card-border)', background: selectedChat?.id === msg.id ? 'rgba(59, 130, 246, 0.05)' : 'transparent', cursor: 'pointer', position: 'relative' }}>
                    {msg.status === 'unread' && <div className="dot"></div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}><span style={{ fontWeight: '700', fontSize: '1.1rem' }}>{msg.from}</span><span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{msg.time}</span></div>
                    <div className="truncate-text">{msg.text}</div>
                  </div>
                )) : <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('noMessages')}</div>}
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)' }}>
              {selectedChat ? (
                <>
                  <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><div className="avatar-circle"><Users color="var(--accent-color)" size={24} /></div><div><div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{selectedChat.from}</div><div style={{ fontSize: '0.8rem', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Shield size={12} /> {t('secureConnection')}</div></div></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><button onClick={startCall} className="status-badge clickable"><Signal size={16} /> {t('voiceCall')}</button><MoreVertical size={22} color="var(--text-secondary)" cursor="pointer" /></div>
                  </div>

                  <div style={{ flex: 1, padding: '2.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="message-bubble-in">{selectedChat.text}</div>
                    {sentMessages.map(m => <div key={m.id} className="message-bubble-out">{m.text}</div>)}
                  </div>

                  <div style={{ padding: '1.5rem 2rem', background: 'rgba(5,7,10,0.4)', borderTop: '1px solid var(--card-border)', marginBottom: '4rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-color)', fontSize: '0.75rem', fontWeight: '800', borderRight: '1px solid var(--card-border)', paddingRight: '1rem', whiteSpace: 'nowrap' }}><Sparkles size={14} /> {t('aiSuggestions')}</div>
                      {MOCK_SMART_REPLIES[lang].map(reply => (
                        <button key={reply.id} onClick={() => handleSendMessage(reply.text)} className="suggestion-chip">{reply.text}</button>
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
          </div>
        )}

        {/* Profiles View - MANY-TO-MANY TEAM MGMT */}
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
        <div className="call-overlay"><div className="call-card"><div className="call-avatar-container"><div className="call-avatar"><Users size={48} color="white" /></div></div><h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>{activeCall.caller}</h2><p>{formatTime(callTime)}</p><button onClick={endCall} className="call-btn end"><Phone size={24} style={{ transform: 'rotate(135deg)' }} /></button></div></div>
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
