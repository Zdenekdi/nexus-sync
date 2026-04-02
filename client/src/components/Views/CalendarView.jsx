import React from 'react';
import { 
  Plus, Share2, Link, X, RefreshCw, Calendar, MoreVertical, Clock, Zap 
} from 'lucide-react';

const CalendarView = ({
  isMobile,
  t,
  lang,
  activeProfileId,
  setActiveProfileId,
  allAgencyProfiles,
  myProfiles,
  activeRole,
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
  setSelectedScheduleEvent
}) => {
  return (
    <div style={{ padding: isMobile ? '1.5rem 1rem' : '3rem', paddingBottom: '8rem', flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }} className="fade-in custom-scrollbar">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '2.5rem', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '1rem' : '0' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '800' }}>{t('bookingSchedule')}</h2>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>•</span>
              <select 
                value={activeProfileId} 
                onChange={(e) => setActiveProfileId(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid var(--card-border)', 
                  color: 'var(--accent-color)', 
                  padding: '0.4rem 1rem', 
                  borderRadius: '8px', 
                  fontSize: '0.9rem', 
                  fontWeight: '700',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {(activeRole === 'App Owner' || activeRole === 'Agency Admin' || activeRole === 'Manager' ? allAgencyProfiles : myProfiles).map(p => (
                  <option key={p.id} value={p.id} style={{ background: '#0a0c10', color: 'white' }}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{t('bookingScheduleDesc')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', width: isMobile ? '100%' : 'auto', flexDirection: isMobile ? 'column' : 'row' }}>
           <button onClick={() => setIsBookingModalOpen(true)} style={{ padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', color: 'white', border: 'none', background: 'var(--accent-color)', borderRadius: '15px', fontWeight: '800', fontSize: '0.85rem' }}>
             <Plus size={16} /> {lang === 'cz' ? 'Přidat akci' : 'Add Booking'}
           </button>
           <button 
             onClick={handleExportICS}
             className="glass-card" 
             style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start', gap: '0.75rem', cursor: 'pointer', color: 'white', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.05)', borderRadius: '15px', flex: isMobile ? 1 : 'none' }}
           >
             <Share2 size={18} /> <span>{t('exportCalendar')}</span>
           </button>
           <button 
             onClick={() => setIsCalendarSyncOpen(!isCalendarSyncOpen)}
             className="glass-card" 
             style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start', gap: '0.75rem', cursor: 'pointer', color: 'var(--accent-color)', border: '1px solid var(--accent-color)', background: 'rgba(59,130,246,0.1)', borderRadius: '15px', flex: isMobile ? 1 : 'none' }}
           >
             <Link size={18} /> <span>{t('syncCalendar')}</span>
           </button>
        </div>
      </div>

      {isCalendarSyncOpen && (
        <div className="glass-card fade-in" style={{ position: 'relative', padding: '1.5rem 1.5rem 2rem', marginBottom: '2rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <button onClick={() => setIsCalendarSyncOpen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RefreshCw size={18} /> {t('syncCalendar')}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '480px' }}>{t('syncDesc')}</p>
            <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '560px', flexDirection: isMobile ? 'column' : 'row' }}>
              <input
                type="text"
                placeholder="https://calendar.google.com/calendar/ical/..."
                value={calendarSyncUrl}
                onChange={(e) => setCalendarSyncUrl(e.target.value)}
                style={{ flex: 1, padding: '0.75rem 1.25rem' }}
                className="glass-input"
              />
              <button className="action-btn" onClick={handleSaveCalendarSync} style={{ whiteSpace: 'nowrap' }}>{t('add')}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: isMobile ? 'column' : 'row', gridTemplateColumns: isMobile ? '1fr' : '1fr 350px', gap: '2rem', flex: isMobile ? 'none' : 1, minHeight: isMobile ? 'auto' : 0 }}>
        <div className="glass-card" style={{ padding: isMobile ? '1.25rem' : '2rem', overflowY: isMobile ? 'visible' : 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {bookingSchedule.length === 0 ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Calendar size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                  <p>{t('noEventsToday') || 'No bookings scheduled for today.'}</p>
                </div>
              ) : (
                bookingSchedule.sort((a,b) => {
                  const timeToMins = (ti) => {
                    if (!ti) return 0;
                    const [h, m] = ti.split(' ')[0].split(':').map(Number);
                    const isPm = ti.includes('PM') && h !== 12;
                    return (isPm ? h + 12 : (ti.includes('AM') && h === 12 ? 0 : h)) * 60 + (m || 0);
                  };
                  return timeToMins(a.time) - timeToMins(b.time);
                }).map((event, idx) => (
                  <div key={idx} onClick={() => isMobile && setSelectedScheduleEvent(event)} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: isMobile ? '1rem' : '1.5rem', 
                    padding: isMobile ? '1rem' : '1.25rem', 
                    background: activeTimerEvent?.id === event.id ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)', 
                    borderRadius: '16px', 
                    border: `1px solid ${activeTimerEvent?.id === event.id ? 'rgba(16,185,129,0.3)' : 'var(--card-border)'}`,
                    borderLeft: `4px solid ${event.type === 'work' ? 'var(--accent-color)' : 'var(--warning-color)'}`,
                    cursor: isMobile ? 'pointer' : 'default',
                    userSelect: 'none'
                  }}>
                    <div style={{ width: isMobile ? '70px' : '80px', flexShrink: 0 }}>
                      <div style={{ fontWeight: '800', fontSize: isMobile ? '1rem' : '1.1rem' }}>{event.time}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{event.duration}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '700', fontSize: isMobile ? '0.9rem' : '1rem', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: (event.status || '').toLowerCase() === 'busy' ? 'var(--error-color)' : 'var(--success-color)' }}></div>
                        {(event.status || 'AVAILABLE').toUpperCase()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1rem' }}>
                      {activeTimerEvent?.id === event.id ? (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleCheckOut(); }}
                          className="action-btn" 
                          style={{ margin: 0, padding: isMobile ? '0.4rem 0.6rem' : '0.5rem 1rem', background: 'var(--success-color)', fontSize: '0.7rem' }}
                        >
                          {isMobile ? 'OUT' : 'CHECK-OUT'}
                        </button>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleCheckIn(event); }}
                          className="action-btn" 
                          style={{ margin: 0, padding: isMobile ? '0.4rem 0.6rem' : '0.5rem 1rem', background: isTimerActive ? 'rgba(255,255,255,0.05)' : 'var(--accent-color)', fontSize: '0.7rem', opacity: isTimerActive ? 0.5 : 1 }}
                          disabled={isTimerActive}
                        >
                          {isMobile ? 'IN' : 'CHECK-IN'}
                        </button>
                      )}
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenBookingMenuId(openBookingMenuId === event.id ? null : event.id); }}
                          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.35rem', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openBookingMenuId === event.id && (
                          <div
                            style={{ position: 'absolute', right: 0, top: '100%', zIndex: 999, minWidth: '140px', background: '#1a1d27', border: '1px solid var(--card-border)', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', padding: '0.35rem', marginTop: '4px' }}
                            onClick={e => e.stopPropagation()}
                          >
                            <button onClick={() => handleEditBooking(event)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', color: 'white', padding: '0.5rem 0.75rem', borderRadius: '7px', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              ✏️ Upravit
                            </button>
                            <button onClick={() => handleDeleteBooking(event.id)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#ef4444', padding: '0.5rem 0.75rem', borderRadius: '7px', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              🗑 Smazat
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            
            {isTimerActive && (
              <div className="glass-card fade-in" style={{ marginTop: '2rem', padding: '1.5rem', background: timeLeft <= 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.05)', border: `1px solid ${timeLeft <= 0 ? '#ef4444' : '#10b981'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className={`pulse-${timeLeft <= 0 ? 'red' : 'green'}`} style={{ width: '12px', height: '12px', borderRadius: '50%', background: timeLeft <= 0 ? '#ef4444' : '#10b981' }} />
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Safety Guard Active</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '800' }}>{activeTimerEvent?.title}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900', color: timeLeft <= 0 ? '#ef4444' : 'white', fontFamily: 'monospace' }}>
                      {formatSafetyTime(timeLeft)}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{timeLeft <= 0 ? 'OVERTIME' : 'TIME REMAINING'}</div>
                  </div>
                </div>
                {timeLeft <= 0 && (
                  <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                    <button
                      onClick={handleCheckOut}
                      disabled={isSafetyLoading}
                      className="action-btn"
                      style={{
                        margin: 0,
                        padding: '0.55rem 0.9rem',
                        fontSize: '0.72rem',
                        background: 'rgba(239, 68, 68, 0.25)',
                        border: '1px solid rgba(239, 68, 68, 0.55)',
                        color: '#fecaca',
                        opacity: isSafetyLoading ? 0.7 : 1,
                      }}
                    >
                      {isSafetyLoading ? 'SAVING...' : 'CHECK-OUT NOW'}
                    </button>
                    <button
                      onClick={handleSafetyImOk}
                      disabled={isSafetyLoading}
                      className="action-btn"
                      style={{
                        margin: 0,
                        padding: '0.55rem 0.9rem',
                        fontSize: '0.72rem',
                        background: 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid rgba(16, 185, 129, 0.5)',
                        color: '#86efac',
                        opacity: isSafetyLoading ? 0.7 : 1,
                      }}
                    >
                      {isSafetyLoading ? 'SAVING...' : "I'M OK (+10m)"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="var(--warning-color)" /> {t('recommendedSlots')}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {SAFETY_SUGGESTIONS.map(s => (
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
  );
};

export default CalendarView;
