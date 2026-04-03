import React, { useState, useMemo } from 'react';
import { FileSearch, StickyNote, User, Phone, Edit2, Check, X, Search, ChevronDown } from 'lucide-react';

import { useNexus } from '../context/NexusContext';

const QAView = () => {
  const nexus = useNexus();
  const { 
    t, 
    messages, 
    clientNotes, 
    clientNames, 
    updateClientName, 
    activeOperator, 
    profiles, 
    operators,
    isMobile 
  } = nexus;
  const [mobileView, setMobileView] = useState('list');
  const [selectedClient, setSelectedClient] = useState(null);
  const [editingName, setEditingName] = useState(null);
  const [tempName, setTempName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // QA filter state — operator or individual profile/model
  const [filterOperatorId, setFilterOperatorId] = useState('all');
  const [filterProfileId, setFilterProfileId] = useState('all');

  // Determine which profiles are visible based on filters
  const visibleProfileIds = useMemo(() => {
    // If a specific profile is selected, use only that
    if (filterProfileId !== 'all') return [filterProfileId];

    // If a specific operator is selected, use all profiles assigned to that operator
    if (filterOperatorId !== 'all') {
      return (profiles || [])
        .filter(p => 
          (p.operators || []).some(o => o.id === filterOperatorId) || 
          (p.assignees || []).some(a => a.id === filterOperatorId)
        )
        .map(p => p.id);
    }

    // Default: show all profiles for the current operator's agency
    return (profiles || [])
      .filter(p => activeOperator?.isAppOwner || p.clientId === activeOperator?.clientId)
      .map(p => p.id);
  }, [filterOperatorId, filterProfileId, profiles, activeOperator]);

  // Build list of visible messages filtered by visible profiles
  const visibleMessages = useMemo(() => {
    if ((visibleProfileIds || []).length === 0) return (messages || []);
    return (messages || []).filter(m => (visibleProfileIds || []).includes(m.profileId));
  }, [messages, visibleProfileIds]);

  // Extract unique clients from filtered messages
  const clients = useMemo(() => {
    const clientsMap = new Map();
    (visibleMessages || []).forEach(msg => {
      if (msg.from && !clientsMap.has(msg.from)) {
        clientsMap.set(msg.from, {
          phoneNumber: msg.from,
          name: clientNames[msg.from] || null,
          lastMessage: msg.text,
          time: msg.time
        });
      }
    });
    return Array.from(clientsMap.values());
  }, [visibleMessages, clientNames]);

  const filteredClients = (clients || []).filter(c =>
    c.phoneNumber.includes(searchQuery) ||
    (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeClient = selectedClient || (filteredClients.length > 0 ? filteredClients[0].phoneNumber : null);
  const currentClientData = (clients || []).find(c => c.phoneNumber === activeClient);

  const handleStartEdit = (client) => {
    setEditingName(client.phoneNumber);
    setTempName(client.name || '');
  };

  const handleSaveName = (phoneNumber) => {
    updateClientName(phoneNumber, tempName);
    setEditingName(null);
  };

  // Operators scoped to current agency
  const agencyOperators = useMemo(() =>
    (operators || []).filter(op => !op.isAppOwner && !op.isModel && (activeOperator?.isAppOwner || op.clientId === activeOperator?.clientId)),
    [operators, activeOperator]
  );

  // Profiles for the selected operator (or all agency profiles)
  const operatorProfiles = useMemo(() => {
    if (filterOperatorId === 'all') {
      return (profiles || []).filter(p => activeOperator?.isAppOwner || p.clientId === activeOperator?.clientId);
    }
    return (profiles || []).filter(p => 
      (p.operators || []).some(o => o.id === filterOperatorId) || 
      (p.assignees || []).some(a => a.id === filterOperatorId)
    );
  }, [filterOperatorId, profiles, activeOperator]);

  return (
    <div style={{ display: 'flex', height: isMobile ? 'calc(100dvh - max(env(safe-area-inset-top), 1rem) - 3rem)' : '100%', background: 'rgba(0,0,0,0.2)', position: 'relative', overflow: 'hidden' }}>
      {/* Left Sidebar - Client List */}
      <div style={{
        width: isMobile ? '100%' : '350px',
        borderRight: isMobile ? 'none' : '1px solid var(--card-border)',
        display: (isMobile && mobileView !== 'list') ? 'none' : 'flex',
        flexDirection: 'column',
        background: 'rgba(255,255,255,0.02)',
        height: '100%',
        paddingRight: isMobile ? `calc(env(safe-area-inset-right))` : 0,
        paddingLeft: isMobile ? `calc(env(safe-area-inset-left))` : 0,
        paddingTop: isMobile ? `calc(env(safe-area-inset-top))` : 0,
        paddingBottom: isMobile ? `calc(max(env(safe-area-inset-bottom), 1rem))` : 0
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--card-border)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <FileSearch size={20} color="var(--accent-color)" /> {t('qa')}
          </h2>

          {/* Operator / Model filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <select
                value={filterOperatorId}
                onChange={e => { setFilterOperatorId(e.target.value); setFilterProfileId('all'); setSelectedClient(null); }}
                style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--card-border)', padding: '0.55rem 2rem 0.55rem 0.75rem', borderRadius: '10px', color: 'white', fontSize: '0.8rem', fontWeight: '700', appearance: 'none', cursor: 'pointer' }}
              >
                <option value="all">All Operators</option>
                {agencyOperators.map(op => (
                  <option key={op.id} value={op.id}>{op.name} — {op.role}</option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
            </div>

            <div style={{ position: 'relative' }}>
              <select
                value={filterProfileId}
                onChange={e => { setFilterProfileId(e.target.value); setSelectedClient(null); }}
                style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--card-border)', padding: '0.55rem 2rem 0.55rem 0.75rem', borderRadius: '10px', color: 'white', fontSize: '0.8rem', fontWeight: '700', appearance: 'none', cursor: 'pointer' }}
              >
                <option value="all">All Models</option>
                {operatorProfiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--card-border)', padding: '0.6rem 0.6rem 0.6rem 2.5rem', borderRadius: '10px', color: 'white', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
          {filteredClients.map(client => (
            <button
              key={client.phoneNumber}
              onClick={() => {
                setSelectedClient(client.phoneNumber);
                if (isMobile) setMobileView('detail');
              }}
              style={{
                width: '100%',
                padding: '1.25rem',
                border: 'none',
                background: activeClient === client.phoneNumber ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                borderLeft: activeClient === client.phoneNumber ? '3px solid var(--accent-color)' : '3px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                borderBottom: '1px solid rgba(255,255,255,0.03)'
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: activeClient === client.phoneNumber ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '800'
              }}>
                {client.name ? client.name.charAt(0).toUpperCase() : <User size={18} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: client.name ? 'white' : 'var(--text-secondary)' }}>
                  {client.name || client.phoneNumber}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  {client.name ? client.phoneNumber : t('unnamedClient')}
                </div>
              </div>
            </button>
          ))}
          {filteredClients.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {t('noResults')}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Client Detail */}
      <div style={{
        flex: 1,
        display: (isMobile && mobileView !== 'detail') ? 'none' : 'flex',
        flexDirection: 'column',
        background: 'rgba(0,0,0,0.1)',
        height: '100%'
      }}>
        {currentClientData ? (
          <>
            <div style={{ padding: isMobile ? '1rem' : '2rem', borderBottom: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '1rem' : 0 }}>
                {isMobile && (
                  <button
                    onClick={() => setMobileView('list')}
                    style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', color: 'white', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: '800' }}>← {t('backToChat')}</span>
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '1rem' : '1.5rem' }}>
                <div style={{ width: isMobile ? '48px' : '64px', height: isMobile ? '48px' : '64px', borderRadius: isMobile ? '12px' : '16px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: isMobile ? '1.25rem' : '1.5rem', boxShadow: '0 10px 20px rgba(59, 130, 246, 0.2)' }}>
                  {currentClientData.name ? currentClientData.name.charAt(0).toUpperCase() : '??'}
                </div>
                <div>
                  {editingName === currentClientData.phoneNumber ? (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={tempName}
                        onChange={e => setTempName(e.target.value)}
                        placeholder={t('clientNameLabel')}
                        autoFocus
                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--accent-color)', padding: '0.5rem 1rem', borderRadius: '8px', color: 'white', fontSize: '1.25rem', fontWeight: '800' }}
                      />
                      <button onClick={() => handleSaveName(currentClientData.phoneNumber)} style={{ background: 'var(--success-color)', border: 'none', color: 'white', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}><Check size={20} /></button>
                      <button onClick={() => setEditingName(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}><X size={20} /></button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.75rem', fontWeight: '900' }}>{currentClientData.name || t('unnamedClient')}</h2>
                      <button onClick={() => handleStartEdit(currentClientData)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem' }}><Edit2 size={18} /></button>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '1rem' }}>
                    <Phone size={14} /> {currentClientData.phoneNumber}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, padding: isMobile ? '1rem' : '2rem', overflowY: 'auto' }} className="custom-scrollbar">
              <div style={{ maxWidth: '800px' }}>
                <h3 style={{ fontSize: '1rem', color: '#f59e0b', marginBottom: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <StickyNote size={18} /> {t('internalNotesLog')}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(clientNotes[currentClientData.phoneNumber] || []).length > 0 ? (
                    clientNotes[currentClientData.phoneNumber].map(note => (
                      <div key={note.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', padding: '1.5rem', borderRadius: '16px' }}>
                        <div style={{ fontSize: '1.1rem', color: 'white', marginBottom: '1rem', lineHeight: '1.6' }}>{note.text}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                          <span>{t('loggedBy')}: <strong style={{ color: 'white' }}>{note.author}</strong></span>
                          <span>{note.timestamp}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <StickyNote size={40} color="rgba(255,255,255,0.1)" />
                      <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{t('noNotes')}</div>
                    </div>
                  )}
                </div>

                <h3 style={{ fontSize: '1rem', color: 'var(--accent-color)', marginTop: '3rem', marginBottom: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <Search size={18} /> {t('recentCommunicationHistory')}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(visibleMessages || []).filter(m => m.from === currentClientData.phoneNumber).map(m => (
                    <div key={m.id} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: '800', color: (m.status || '').toLowerCase() === 'read' ? 'var(--success-color)' : 'var(--accent-color)', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)' }}>
                          {(m.status || 'UNKNOWN').toUpperCase()}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.time}</span>
                      </div>
                      <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{m.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', gap: '1.5rem' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileSearch size={40} />
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: '700' }}>{t('selectClientToViewQA')}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QAView;
