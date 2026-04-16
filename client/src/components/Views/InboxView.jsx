import React from 'react';
import { 
  Search, MessageSquare, Phone, Clock, Link, Globe, Shield, Check, 
  Zap, Calendar, ChevronDown, ChevronLeft, ChevronRight, PlusCircle, 
  Signal, MoreVertical, StickyNote, Languages, Sparkles 
} from 'lucide-react';

import { useNexus } from '../../context/NexusBaseContext';

const InboxView = () => {
  const nexus = useNexus();
  const {
    isMobile, mobileView, setMobileView, activeProfileId, setActiveProfileId,
    myProfiles: assignedProfiles, selectedChatId, setSelectedChatId,
    isTranslating, sourceText, setSourceText, translatedText,
    internalNote, setInternalNote, clientNotes, clientNames,
    filteredMessages, selectedChat, chatMessages, isHistoryLoading,
    chatScrollRef, isUserScrolled, typingProfiles, inlinePanelTab,
    setInlinePanelTab, activeOperator, setShowPanicConfirm,
    detectedMeeting, setDetectedMeeting, messageValue, setMessageValue,
    bookingSchedule, calViewDate, setCalViewDate, setIsBookingModalOpen,
    setNewBookingForm, activeContextTab, setActiveContextTab, lang, t,
    activeProfile, handleSendMessage, handleTranslate, handleSaveNote,
    handleDeleteNote, startCall, handleQuickSaveMeeting, showToast
  } = nexus;
  return (
    <div data-testid="page-inbox-container" style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden', position: 'relative' }} className="fade-in inbox-grid">
      {/* Column 1: Inbox List */}
      {(!isMobile || mobileView === 'list') && (
        <div className={`inbox-panel ${!selectedChatId ? 'active' : ''}`} style={{ width: isMobile ? '100%' : '380px', flexShrink: 0, borderRight: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '1rem' }}>
              <h2 data-testid="page-inbox-title" style={{ fontSize: '1.5rem', whiteSpace: 'nowrap' }}>{t('inbox')}</h2>
              <div style={{ position: 'relative', flex: 1, maxWidth: '200px' }}>
                <select data-testid="input-profile-filter" value={activeProfileId} 
                  onChange={(e) => {
                    setActiveProfileId(e.target.value);
                    setSelectedChatId(null); 
                  }}
                  style={{ 
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)', 
                    border: '1px solid var(--card-border)', 
                    padding: '0.4rem 2rem 0.4rem 0.85rem', 
                    borderRadius: '10px', 
                    color: 'white',
                    fontSize: '0.8rem',
                    fontWeight: '800',
                    appearance: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">📥 {lang === 'cz' ? 'Všechny profily' : 'All Profiles'}</option>
                  {assignedProfiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }} />
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input data-testid="input-search-chats" type="text" placeholder={t('searchPlaceholder')} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.85rem 0.85rem 0.85rem 2.5rem', borderRadius: '12px', color: 'white' }} />
            </div>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredMessages.length > 0 ? filteredMessages.map(msg => (
              <div key={msg.id} onClick={() => { 
                setSelectedChatId(msg.id); 
                if (isMobile) setMobileView('chat');
                if (!isTranslating) {
                  setSourceText("");
                }
                setInternalNote("");
              }}
                style={{ 
                  padding: '1.5rem', 
                  borderBottom: '1px solid var(--card-border)', 
                  background: selectedChatId === msg.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent', 
                  cursor: 'pointer', 
                  position: 'relative',
                  borderLeft: selectedChatId === msg.id ? '6px solid var(--accent-color)' : '6px solid transparent',
                  boxShadow: selectedChatId === msg.id ? 'inset 0 0 20px rgba(59, 130, 246, 0.1)' : 'none',
                  transition: 'all 0.2s ease'
                }}>
                    {msg.status === 'unread' && <div className="dot"></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: selectedChatId === msg.id ? '800' : '700', fontSize: '1.1rem', color: selectedChatId === msg.id ? 'white' : 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {clientNames[msg.from] || msg.from}
                    {activeProfileId === 'all' && msg.profileName && (
                      <span style={{ fontSize: '0.65rem', background: 'rgba(59,130,246,0.2)', color: 'var(--accent-color)', padding: '2px 6px', borderRadius: '6px', fontWeight: 600 }}>{msg.profileName}</span>
                    )}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{msg.time}</span>
                </div>
                <div className="truncate-text" style={{ opacity: selectedChatId === msg.id ? 1 : 0.7 }}>{msg.text}</div>
              </div>
            )) : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', gap: '0.75rem' }}>
              <MessageSquare size={48} color="#374151" />
              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#64748b' }}>{t('noMessages')}</div>
              <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                {lang === 'cz' ? 'Zprávy se zobrazí po přijetí první konverzace' : 'Messages will appear once you receive your first conversation'}
              </div>
            </div>}
            <div style={{ height: isMobile ? '80px' : '0' }}></div>
          </div>
        </div>
      )}

      {(!isMobile || mobileView !== 'list') && (
        <div className={`inbox-panel ${selectedChatId ? 'active' : ''} ${isMobile && !selectedChatId ? 'hidden-mobile' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)', minWidth: 0, overflow: 'hidden', minHeight: 0 }}>
            {selectedChat ? (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
                <div style={{ paddingTop: isMobile ? 'env(safe-area-inset-top, 0px)' : '1.5rem', paddingBottom: isMobile ? '0.75rem' : '1.5rem', paddingLeft: isMobile ? '1rem' : '2rem', paddingRight: isMobile ? '1rem' : '2rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)', flexShrink: 0 }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1rem' }}>
                    <button onClick={startCall} className="status-badge" style={{ color: 'var(--accent-color)', cursor: 'pointer', background: 'rgba(59, 130, 246, 0.1)', border: 'none', padding: '0.5rem 0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: '800' }}>
                      <Signal size={14} /> CALL
                    </button>
                    {(activeOperator?.isModel || (isMobile && activeOperator && !activeOperator?.isAppOwner && !activeOperator?.isAdmin && !activeOperator?.isManager)) && (
                      <button 
                        onClick={() => setShowPanicConfirm(true)}
                        style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Shield size={20} />
                      </button>
                    )}
                    <button 
                      onClick={() => showToast(lang === 'cz' ? 'Brzy k dispozici' : 'Options coming soon', 'info')}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <MoreVertical size={22} />
                    </button>
                  </div>
                </div>
                <div
                  ref={chatScrollRef}
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
                    isUserScrolled.current = distFromBottom > 100;
                  }}
                  style={{ flex: 1, padding: isMobile ? '0.5rem 0.75rem' : '2rem', overflowY: 'auto', WebkitOverflowScrolling: 'touch', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: isMobile ? '0' : '0.25rem', minHeight: 0, justifyContent: 'flex-end' }}>
                   {isHistoryLoading && chatMessages.length === 0 ? (
                     <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading history...</div>
                   ) : chatMessages.length > 0 ? (
                     chatMessages.map((msg, i) => (
                       <div key={msg.id || i} className={msg.direction === 'OUTBOUND' ? 'message-bubble-out' : 'message-bubble-in'} style={{ alignSelf: msg.direction === 'OUTBOUND' ? 'flex-end' : 'flex-start', marginBottom: isMobile ? '0.35rem' : '0.6rem' }}>
                         <div style={{ fontSize: isMobile ? '0.88rem' : '0.95rem' }}>{msg.text}</div>
                         <div style={{ fontSize: '0.62rem', opacity: 0.5, marginTop: '2px', textAlign: 'right' }}>
                           {new Date(msg.createdAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' })}
                         </div>
                       </div>
                     ))
                   ) : (
                     <div className="message-bubble-in" style={{ marginBottom: '1rem' }}>{selectedChat.text}</div>
                   )}

                   {typingProfiles[activeProfileId] === selectedChat.from && (
                     <div className="message-bubble-in fade-in" style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content' }}>
                       <div className="typing-dot" style={{ width: '6px', height: '6px', background: 'var(--accent-color)', borderRadius: '50%', animation: 'bounce 0.6s infinite alternate' }}></div>
                       <div className="typing-dot" style={{ width: '6px', height: '6px', background: 'var(--accent-color)', borderRadius: '50%', animation: 'bounce 0.6s infinite alternate 0.2s' }}></div>
                       <div className="typing-dot" style={{ width: '6px', height: '6px', background: 'var(--accent-color)', borderRadius: '50%', animation: 'bounce 0.6s infinite alternate 0.4s' }}></div>
                     </div>
                   )}
                </div>
                <div style={{ borderTop: '1px solid var(--card-border)' }}>
                  {isMobile && (
                    <>
                      <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}>
                        {[{id:'note',icon:StickyNote,label:lang==='cz'?'Poznámky':'Notes',color:'#f59e0b'},{id:'translator',icon:Languages,label:lang==='cz'?'Překladač':'Translator',color:'#3b82f6'},{id:'quickReplies',icon:Zap,label:lang==='cz'?'Odpovědi':'Replies',color:'#10b981'}].map(({id,icon:Icon,label,color})=>(<button key={id} onClick={()=>setInlinePanelTab(prev=>prev===id?null:id)} style={{display:'flex',alignItems:'center',gap:'0.3rem',padding:'0.25rem 0.6rem',borderRadius:'8px',cursor:'pointer',fontSize:'0.67rem',fontWeight:'700',background:inlinePanelTab===id?`rgba(${id==='note'?'245,158,11':id==='translator'?'59,130,246':'16,185,129'},0.15)`:'rgba(255,255,255,0.04)',border:`1px solid ${inlinePanelTab===id?color:'rgba(255,255,255,0.07)'}`,color:inlinePanelTab===id?color:'var(--text-secondary)',transition:'all 0.18s'}}><Icon size={11}/> {label}</button>))}
                      </div>
                      {inlinePanelTab && (
                        <div className="fade-in custom-scrollbar" style={{borderBottom:'1px solid var(--card-border)',padding:'0.75rem 1.25rem',maxHeight:'175px',overflowY:'auto',background:'rgba(255,255,255,0.01)'}}>
                          {inlinePanelTab==='note' && (<div style={{display:'flex',flexDirection:'column',gap:'0.45rem'}}><textarea value={internalNote} onChange={e=>setInternalNote(e.target.value)} placeholder={lang==='cz'?'Přidat poznámku...':'Add internal note...'} style={{width:'100%',minHeight:'62px',background:'rgba(245,158,11,0.05)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'10px',padding:'0.55rem 0.7rem',color:'#f59e0b',resize:'none',fontSize:'0.81rem'}}/><button onClick={handleSaveNote} disabled={!internalNote.trim()} style={{alignSelf:'flex-end',background:'rgba(245,158,11,0.2)',color:'#f59e0b',border:'1px solid rgba(245,158,11,0.4)',padding:'0.25rem 0.8rem',borderRadius:'8px',fontWeight:'700',fontSize:'0.69rem',opacity:internalNote.trim()?1:0.4}}>{lang==='cz'?'Uložit':'Save'}</button></div>)}
                          {inlinePanelTab==='translator' && (<div style={{display:'flex',flexDirection:'column',gap:'0.45rem'}}><textarea value={sourceText} onChange={e=>setSourceText(e.target.value)} placeholder={lang==='cz'?'Text k překladu...':'Text to translate...'} style={{width:'100%',minHeight:'52px',background:'rgba(59,130,246,0.05)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:'10px',padding:'0.55rem 0.7rem',color:'white',resize:'none',fontSize:'0.81rem'}}/>{translatedText&&<div style={{fontSize:'0.78rem',color:'#93c5fd',padding:'0.38rem 0.62rem',background:'rgba(59,130,246,0.08)',borderRadius:'8px',lineHeight:1.5}}>{translatedText}</div>}<div style={{display:'flex',gap:'0.5rem'}}><button onClick={handleTranslate} disabled={isTranslating||!sourceText.trim()} style={{flex:1,background:'var(--accent-color)',color:'white',border:'none',padding:'0.3rem',borderRadius:'8px',fontWeight:'800',fontSize:'0.67rem',opacity:(!sourceText.trim()||isTranslating)?0.4:1}}>{isTranslating?'…':(lang==='cz'?'PŘELOŽIT':'TRANSLATE')}</button>{translatedText&&<button onClick={()=>{setMessageValue(translatedText);setInlinePanelTab(null);}} style={{flex:1,background:'rgba(59,130,246,0.15)',color:'#93c5fd',border:'1px solid rgba(59,130,246,0.3)',padding:'0.3rem',borderRadius:'8px',fontWeight:'800',fontSize:'0.67rem',cursor:'pointer'}}>{lang==='cz'?'POUŽÍT':'USE'}</button>}</div></div>)}
                          {inlinePanelTab==='quickReplies' && (<div style={{display:'flex',flexDirection:'column',gap:'0.32rem'}}>{!(activeProfile?.quickReplies?.length)?(<div style={{textAlign:'center',padding:'0.75rem',color:'var(--text-secondary)',fontSize:'0.76rem'}}>{lang==='cz'?'Žádné rychlé odpovědi.':'No quick replies yet.'}</div>):activeProfile.quickReplies.map(reply=>(<button key={reply.id} onClick={()=>{setMessageValue(reply.text);setInlinePanelTab(null);}} style={{textAlign:'left',background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.18)',borderRadius:'8px',padding:'0.4rem 0.68rem',cursor:'pointer'}}><div style={{fontSize:'0.65rem',fontWeight:'800',color:'#10b981',marginBottom:'0.06rem'}}>{reply.label}</div><div style={{fontSize:'0.74rem',color:'var(--text-secondary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{reply.text}</div></button>))}</div>)}
                        </div>
                      )}
                    </>
                  )}
                   <div style={{ padding: '0.75rem 1.25rem 1.25rem' }}>
                   {detectedMeeting && (
                     <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.85rem', marginBottom: '0.75rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '10px' }}>
                       <Calendar size={14} color="var(--success-color)" />
                       <span style={{ flex: 1, fontSize: '0.72rem', color: 'var(--success-color)', fontWeight: '700' }}>Detekován čas: <strong>{detectedMeeting.time}</strong> — Uložit schůzku?</span>
                       <button
                         onClick={handleQuickSaveMeeting}
                         style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.35)', color: 'var(--success-color)', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer' }}
                       >Uložit</button>
                       <button onClick={() => setDetectedMeeting(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0 2px' }}>×</button>
                     </div>
                   )}
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
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && messageValue.trim()) {
                            handleSendMessage(messageValue);
                          }
                        }}
                        data-testid="input-message" placeholder="Type a message..." 
                        style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '1rem', borderRadius: '12px', color: 'white' }} 
                      />
                      <button 
                        onClick={() => {
                          if (messageValue.trim()) {
                            handleSendMessage(messageValue);
                          }
                        }}
                        style={{ background: 'var(--accent-color)', color: 'white', border: 'none', padding: '0 1.5rem', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}
                      >
                        SEND
                      </button>
                   </div>
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
          {/* Column 3: Notes / Details (Sibling of Column 2 inside Column 2/3 wrapper) */}
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
                   {/* Tab bar */}
                   <div style={{ display: 'flex', borderBottom: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.02)' }}>
                     <button onClick={() => setActiveContextTab('translator')} style={{ flex: 1, padding: '0.6rem 0.25rem', border: 'none', background: 'transparent', color: activeContextTab === 'translator' ? 'var(--accent-color)' : 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.7rem' }}>
                       <Languages size={13} /> {lang === 'cz' ? 'Překladač' : 'Translator'}
                     </button>
                     <button onClick={() => setActiveContextTab('note')} style={{ flex: 1, padding: '0.6rem 0.25rem', border: 'none', background: 'transparent', color: activeContextTab === 'note' ? '#f59e0b' : 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.7rem' }}>
                       <StickyNote size={13} /> {lang === 'cz' ? 'Poznámky' : 'Notes'}
                     </button>
                     <button onClick={() => setActiveContextTab('quickReplies')} style={{ flex: 1, padding: '0.6rem 0.25rem', border: 'none', background: 'transparent', color: activeContextTab === 'quickReplies' ? '#10b981' : 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.7rem' }}>
                       <Zap size={13} /> {lang === 'cz' ? 'Odpovědi' : 'Replies'}
                     </button>
                   </div>
                  {/* Tab content */}
                  <div style={{ padding: '1.25rem', flex: '1 1 0', minHeight: 0, maxHeight: '45%', overflowY: 'auto' }}>
                    {activeContextTab === 'translator' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder={t('typeResponse')} style={{ width: '100%', height: '100px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '1rem', color: 'white', resize: 'none' }} />
                        <button onClick={handleTranslate} disabled={isTranslating} style={{ background: 'var(--accent-color)', color: 'white', border: 'none', padding: '0.75rem 1rem', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          {isTranslating ? (<><div className="loader-dots" style={{ display: 'flex', gap: '4px' }}><span style={{ width: '4px', height: '4px', background: 'white', borderRadius: '50%' }}></span><span style={{ width: '4px', height: '4px', background: 'white', borderRadius: '50%' }}></span><span style={{ width: '4px', height: '4px', background: 'white', borderRadius: '50%' }}></span></div>{t('translating')}</>) : (<><Sparkles size={16} /> {lang === 'cz' ? 'PŘELOŽIT PŘES AI' : 'TRANSLATE VIA AI'}</>)}
                        </button>
                        {translatedText && (
                          <div className="fade-in" style={{ padding: '1rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '-8px', right: '12px', background: 'var(--accent-color)', color: 'white', fontSize: '0.6rem', fontWeight: '900', padding: '2px 8px', borderRadius: '4px' }}>{t('poweredByAi')}</div>
                            <div style={{ fontSize: '0.9rem', color: 'white', lineHeight: '1.5' }}>{translatedText}</div>
                            <button onClick={() => { setMessageValue(translatedText); setActiveContextTab('note'); }} style={{ marginTop: '0.75rem', width: '100%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '0.4rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer' }}>
                              {lang === 'cz' ? 'POUŽÍT PŘEKLAD' : 'USE TRANSLATION'}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : activeContextTab === 'note' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} placeholder="Add internal note..." style={{ width: '100%', minHeight: '100px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '1rem', color: '#f59e0b' }} />
                        <button onClick={handleSaveNote} disabled={!internalNote.trim()} style={{ alignSelf: 'flex-end', background: 'rgba(245,158,11,0.2)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.4)', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: '700' }}>Save Note</button>
                        {(clientNotes[selectedChat?.from] || []).length > 0 && (
                          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>SAVED NOTES</div>
                            {(clientNotes[selectedChat.from] || []).slice().reverse().map(note => (
                              <div key={note.id} style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '10px', padding: '0.75rem', position: 'relative' }}>
                                <button onClick={() => handleDeleteNote(selectedChat.from, note.id)} style={{ position: 'absolute', top: '6px', right: '8px', background: 'none', border: 'none', color: 'rgba(245,158,11,0.5)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '2px 4px' }}>×</button>
                                <div style={{ fontSize: '0.85rem', color: '#f59e0b', lineHeight: '1.5', paddingRight: '1.5rem' }}>{note.text}</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>{note.author} · {note.timestamp}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Quick Replies tab */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {(activeProfile?.quickReplies || []).length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            <Zap size={32} style={{ opacity: 0.2, marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
                            {lang === 'cz' ? 'Žádné rychlé odpovědi. Přidej je v nastavení profilu.' : 'No quick replies yet. Add them in Profile Settings.'}
                          </div>
                        ) : (
                          (activeProfile.quickReplies || []).map(reply => (
                            <button key={reply.id} onClick={() => setMessageValue(reply.text)} style={{ textAlign: 'left', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '0.75rem 1rem', cursor: 'pointer' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#10b981', marginBottom: '0.2rem' }}>{reply.label}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{reply.text}</div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                {/* Calendar mini-panel below tabs */}
                {(() => {
                  const calDateStr = calViewDate.toISOString().split('T')[0];
                  const bookingsForDate = (bookingSchedule || []).filter(b => b.startTime?.startsWith(calDateStr));
                  const isToday = calDateStr === new Date().toISOString().split('T')[0];
                  const dayName = calViewDate.toLocaleDateString(lang === 'cz' ? 'cs-CZ' : 'en-GB', { weekday: 'long' });
                  const dayDate = calViewDate.toLocaleDateString(lang === 'cz' ? 'cs-CZ' : 'en-GB', { day: 'numeric', month: 'long' });
                  return (
                    <div style={{ borderTop: '1px solid var(--card-border)', flex: '0 0 auto', display: 'flex', flexDirection: 'column', height: '340px' }}>
                      {/* day nav header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(99,102,241,0.05)', borderBottom: '1px solid var(--card-border)', flexShrink: 0 }}>
                        <button onClick={() => { const d = new Date(calViewDate); d.setDate(d.getDate()-1); setCalViewDate(d); }} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '6px', display: 'flex', alignItems: 'center' }}><ChevronLeft size={13} /></button>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.62rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{isToday ? (lang === 'cz' ? 'DNES' : 'TODAY') : dayName}</div>
                          <div style={{ fontSize: '0.8rem', fontWeight: '900', color: isToday ? 'var(--accent-color)' : 'white', lineHeight: 1.2 }}>{dayDate}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                          {!isToday && <button onClick={() => setCalViewDate(new Date())} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '5px', color: '#a5b4fc', fontSize: '0.58rem', fontWeight: '800', cursor: 'pointer', padding: '0.2rem 0.45rem' }}>Dnes</button>}
                          <button onClick={() => { const d = new Date(calViewDate); d.setDate(d.getDate()+1); setCalViewDate(d); }} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '6px', display: 'flex', alignItems: 'center' }}><ChevronRight size={13} /></button>
                        </div>
                      </div>
                      {/* bookings list */}
                      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {bookingsForDate.length === 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                            <Calendar size={24} style={{ opacity: 0.25 }} />
                            <span style={{ fontSize: '0.72rem', fontStyle: 'italic' }}>{lang === 'cz' ? 'Žádné schůzky' : 'No bookings'}</span>
                          </div>
                        ) : bookingsForDate.map(b => {
                          const timeStr = b.startTime ? new Date(b.startTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' }) : (b.time || '');
                          const endStr = b.endTime ? new Date(b.endTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' }) : '';
                          return (
                            <div key={b.id} style={{ display: 'flex', gap: '0.6rem', padding: '0.5rem 0.65rem', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', borderLeft: '3px solid var(--accent-color)', alignItems: 'flex-start' }}>
                              <div style={{ flexShrink: 0, textAlign: 'right', minWidth: '42px' }}>
                                <div style={{ fontSize: '0.67rem', fontWeight: '900', color: 'var(--accent-color)', lineHeight: 1.3 }}>{timeStr}</div>
                                {endStr && <div style={{ fontSize: '0.57rem', color: 'var(--text-secondary)', lineHeight: 1 }}>{endStr}</div>}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                                {b.profileName && <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{b.profileName}</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                {/* Add Booking pinned at bottom of right panel */}
                <div style={{ padding: '0.75rem', borderTop: '1px solid var(--card-border)', background: 'var(--bg-secondary, #0f1117)', flexShrink: 0 }}>
                  <button
                    onClick={() => { const d = calViewDate.toISOString().split('T')[0]; setNewBookingForm(f => ({ ...f, date: d })); setIsBookingModalOpen(true); }}
                    style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--accent-color)', border: 'none', color: 'white', fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <PlusCircle size={16} /> {lang === 'cz' ? 'Přidat schůzku' : 'Add booking'}
                  </button>
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
  );
};

export default InboxView;
