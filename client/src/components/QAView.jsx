import React, { useState, useMemo } from 'react';
import { FileSearch, StickyNote, User, Phone, Edit2, Check, X, Search } from 'lucide-react';

const QAView = ({ t, messages = [], clientNotes = {}, clientNames = {}, updateClientName }) => {
  const [selectedClient, setSelectedClient] = useState(null);
  const [editingName, setEditingName] = useState(null);
  const [tempName, setTempName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique clients from messages
  const clients = useMemo(() => {
    const clientsMap = new Map();
    messages.forEach(msg => {
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
  }, [messages, clientNames]);

  const filteredClients = clients.filter(c => 
    c.phoneNumber.includes(searchQuery) || 
    (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeClient = selectedClient || (filteredClients.length > 0 ? filteredClients[0].phoneNumber : null);
  const currentClientData = clients.find(c => c.phoneNumber === activeClient);

  const handleStartEdit = (client) => {
    setEditingName(client.phoneNumber);
    setTempName(client.name || '');
  };

  const handleSaveName = (phoneNumber) => {
    updateClientName(phoneNumber, tempName);
    setEditingName(null);
  };

  return (
    <div style={{ display: 'flex', height: '100%', background: 'rgba(0,0,0,0.2)' }}>
      {/* Left Sidebar - Client List */}
      <div style={{ width: '350px', borderRight: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--card-border)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <FileSearch size={20} color="var(--accent-color)" /> {t('qa')}
          </h2>
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
              onClick={() => setSelectedClient(client.phoneNumber)}
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)' }}>
        {currentClientData ? (
          <>
            <div style={{ padding: '2rem', borderBottom: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.5rem', boxShadow: '0 10px 20px rgba(59, 130, 246, 0.2)' }}>
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
                        <h2 style={{ fontSize: '1.75rem', fontWeight: '900' }}>{currentClientData.name || t('unnamedClient')}</h2>
                        <button onClick={() => handleStartEdit(currentClientData)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem' }}><Edit2 size={18} /></button>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '1rem' }}>
                      <Phone size={14} /> {currentClientData.phoneNumber}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }} className="custom-scrollbar">
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
                  {messages.filter(m => m.from === currentClientData.phoneNumber).map(m => (
                    <div key={m.id} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: m.status === 'read' ? 'var(--success-color)' : 'var(--accent-color)' }}>
                          {m.status.toUpperCase()}
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
