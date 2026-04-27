import React from 'react';
import { 
  Plus, Share2, Link, X, RefreshCw, Calendar, MoreVertical, Clock
} from 'lucide-react';

import { useNexus } from '../../context/NexusContext';
import PremiumSelector from '../UI/PremiumSelector';

const CalendarView = () => {
  const nexus = useNexus();
  const {
    isMobile, t, lang, activeProfileId, setActiveProfileId,
    profiles: allAgencyProfiles, myProfiles, activeRole, 
    setIsBookingModalOpen, handleExportICS, isCalendarSyncOpen, setIsCalendarSyncOpen,
    calendarSyncUrl, setCalendarSyncUrl, handleSaveCalendarSync,
    calendar: bookingSchedule, activeTimerEvent, isTimerActive,
    openBookingMenuId, setOpenBookingMenuId, handleCheckIn, handleCheckOut,
    handleEditBooking, handleDeleteBooking, timeLeft, formatSafetyTime,
    isSafetyLoading, handleSafetyImOk, SAFETY_SUGGESTIONS,
    setSelectedScheduleEvent, activeOperator: _activeOperator
  } = nexus;

  // Final Safety Check for Mapping
  const safeSchedule = Array.isArray(bookingSchedule) ? bookingSchedule : [];
  const safeProfiles = Array.isArray(allAgencyProfiles) ? allAgencyProfiles : [];
  const safeMyProfiles = Array.isArray(myProfiles) ? myProfiles : [];

  return (
    <div style={{ padding: isMobile ? '1.5rem 1rem' : '3rem', paddingBottom: '8rem', flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }} className="fade-in custom-scrollbar">
      {!isMobile && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexDirection: 'row', gap: '0' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <h2 data-testid="page-calendar-title" style={{ fontSize: '2rem', fontWeight: '800' }}>{t('bookingSchedule')}</h2>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '220px' }} className="premium-selector-fix">
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>•</span>
                <PremiumSelector
                  options={(activeRole === 'App Owner' || activeRole === 'Agency Admin' || activeRole === 'Manager') ? safeProfiles : safeMyProfiles}
                  value={activeProfileId || ''}
                  onChange={(val) => setActiveProfileId(val)}
                  placeholder={t('selectProfile')}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{t('bookingScheduleDesc')}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', width: 'auto', flexDirection: 'row' }}>
             <button data-testid="btn-add-booking" onClick={() => setIsBookingModalOpen(true)} style={{ padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', color: 'white', border: 'none', background: 'var(--accent-color)', borderRadius: '15px', fontWeight: '800', fontSize: '0.85rem' }}>
               <Plus size={16} /> {lang === 'cz' ? 'Přidat akci' : 'Add Booking'}
             </button>
             <button 
               data-testid="btn-export-calendar" onClick={handleExportICS}
               className="glass-card" 
               style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.75rem', cursor: 'pointer', color: 'white', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.05)', borderRadius: '15px', flex: 'none' }}
             >
               <Share2 size={18} /> <span>{t('exportCalendar')}</span>
             </button>
          </div>
        </div>
      )}

      {isMobile && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
           <button onClick={() => setIsBookingModalOpen(true)} style={{ flex: 1, padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', cursor: 'pointer', color: 'white', border: 'none', background: 'var(--accent-color)', borderRadius: '12px', fontWeight: '800', fontSize: '0.8rem' }}>
             <Plus size={14} /> {lang === 'cz' ? 'Přidat' : 'Add'}
           </button>
           <button onClick={handleExportICS} className="glass-card" style={{ flex: 1, padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', cursor: 'pointer', color: 'white', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontWeight: '800', fontSize: '0.8rem' }}>
             <Share2 size={14} /> <span>Export</span>
           </button>
        </div>
      )}
           <button 
             data-testid="btn-sync-calendar-toggle" onClick={() => setIsCalendarSyncOpen(!isCalendarSyncOpen)}
             className="glass-card" 
             style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start', gap: '0.75rem', cursor: 'pointer', color: 'var(--accent-color)', border: '1px solid var(--accent-color)', background: 'rgba(59,130,246,0.1)', borderRadius: '15px', flex: isMobile ? 1 : 'none', marginBottom: '1.5rem' }}
           >
             <Link size={18} /> <span>{t('syncCalendar')}</span>
           </button>

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
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', maxWidth: '600px', flexDirection: isMobile ? 'column' : 'row', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <input
                type="text"
                placeholder="https://calendar.google.com/calendar/ical/..."
                value={calendarSyncUrl || ''}
                onChange={(_err) => setCalendarSyncUrl(_err.target.value)}
                style={{ 
                  flex: 1, 
                  padding: '1rem 1.25rem', 
                  background: 'rgba(0,0,0,0.4)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '14px', 
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
                  transition: 'border-color 0.2s ease'
                }}
                className="glass-input-premium"
              />
              <button 
                className="action-btn" 
                onClick={handleSaveCalendarSync} 
                style={{ 
                  whiteSpace: 'nowrap', 
                  margin: 0, 
                  padding: '0 1.5rem', 
                  height: isMobile ? '48px' : 'auto',
                  borderRadius: '14px',
                  background: 'var(--accent-color)',
                  color: 'white',
                  fontWeight: '800',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {t('add')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: isMobile ? 'column' : 'row', gridTemplateColumns: isMobile ? '1fr' : '1fr 350px', gap: '2rem', flex: isMobile ? 'none' : 1, minHeight: isMobile ? 'auto' : 0 }}>
        <div className="glass-card" style={{ padding: isMobile ? '1.25rem' : '2rem', overflowY: isMobile ? 'visible' : 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {safeSchedule.length === 0 ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Calendar size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                  <p style={{ fontWeight: '600', marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {t('noEventsToday') === 'noEventsToday' ? (lang === 'cz' ? 'Na dnešek nejsou naplánovány žádné rezervace.' : 'No bookings scheduled for today.') : t('noEventsToday')}
                  </p>
                </div>
              ) : (
                safeSchedule.sort((a,b) => {
                  const timeToMins = (ti) => {
                    if (!ti) return 0;
                    const parts = ti.split(' ');
                    const time = parts[0];
                    const [h, m] = time.split(':').map(Number);
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
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: (event.status || '').toLowerCase() === 'busy' ? 'var(--_err-color)' : 'var(--success-color)' }}></div>
                        {(event.status || 'AVAILABLE').toUpperCase()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1rem' }}>
                      {activeTimerEvent?.id === event.id ? (
                        <button 
                          data-testid={`btn-checkout-${event.id}`} onClick={(_err) => { _err.stopPropagation(); handleCheckOut(); }}
                          className="action-btn" 
                          style={{ margin: 0, padding: isMobile ? '0.4rem 0.6rem' : '0.5rem 1rem', background: 'var(--success-color)', fontSize: '0.7rem' }}
                        >
                          {isMobile ? 'OUT' : 'CHECK-OUT'}
                        </button>
                      ) : (
                        <button 
                          data-testid={`btn-checkin-${event.id}`} onClick={(_err) => { _err.stopPropagation(); handleCheckIn(event); }}
                          className="action-btn" 
                          style={{ margin: 0, padding: isMobile ? '0.4rem 0.6rem' : '0.5rem 1rem', background: isTimerActive ? 'rgba(255,255,255,0.05)' : 'var(--accent-color)', fontSize: '0.7rem', opacity: isTimerActive ? 0.5 : 1 }}
                          disabled={isTimerActive}
                        >
                          {isMobile ? 'IN' : 'CHECK-IN'}
                        </button>
                      )}
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={(_err) => { _err.stopPropagation(); setOpenBookingMenuId(openBookingMenuId === event.id ? null : event.id); }}
                          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.35rem', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openBookingMenuId === event.id && (
                          <div
                            style={{ position: 'absolute', right: 0, top: '100%', zIndex: 999, minWidth: '140px', background: '#1a1d27', border: '1px solid var(--card-border)', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', padding: '0.35rem', marginTop: '4px' }}
                            onClick={_err => _err.stopPropagation()}
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
              {(SAFETY_SUGGESTIONS || []).map(s => (
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
