import React, { useState, useEffect } from 'react';
import { DollarSign, Building2, Zap, Activity, TrendingUp, Users, Server, ShieldCheck, AlertTriangle, Calendar, Loader2, MessageSquare, Copy, X } from 'lucide-react';
import { RevenueLineChart, ConversionDonutChart, MiniSparkline } from './AnalyticsCharts';
import { useVultr } from '../hooks/useVultr';
import { useNexus } from '../context/NexusContextCore';
import Skeleton from './UI/Skeleton';
import SafetyControlCard from './Safety/SafetyControlCard';

const DashboardHome = () => {
  const nexus = useNexus();
  const { 
    activeOperator: user, t, lang, agencies, profiles: _profiles, 
    calendar, stats, activeSubscription, isRelayVariant, activeRole,
    isMobile, isBackgroundLoading,
    setLinkedSessionId, linkedSessionId,
    pendingNotifications, setPendingNotifications, onDelayBooking,
    isLoggedIn, showToast: _showToast
  } = nexus;
  
  const { status: vultrStatus } = useVultr();

  const currentAgency = (agencies || [])[0] || {};
  const regions = currentAgency.regions || ['uk'];
  const isMultiregion = currentAgency.isInternational || regions.length > 1;
  const defaultCurrency = isMultiregion ? 'EUR' : (regions[0] === 'cz' ? 'CZK' : (regions[0] === 'us' ? 'USD' : 'GBP'));
  const [dashboardCurrency, setDashboardCurrency] = useState(defaultCurrency);
  
  // Auto-detect active booking and link it to safety session (for Models)
  useEffect(() => {
    if (!isLoggedIn || activeRole !== 'Model' || linkedSessionId) return;
    
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    
    const activeEvent = (calendar || []).find(event => {
      try {
        const [start, end] = (event.time || '').split(' - ');
        if (!start || !end) return false;
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        // Check if current time is within booking window (plus 5 min grace before)
        return nowMin >= (startMin - 5) && nowMin < endMin;
      } catch { return false; }
    });

    if (activeEvent && activeEvent.id && activeEvent.id !== linkedSessionId) {
      setLinkedSessionId(activeEvent.id);
    }
  }, [calendar, isLoggedIn, activeRole, linkedSessionId, setLinkedSessionId]);

  const formatMoney = (val, cur) => {
    const sym = { GBP: '£', EUR: '€', USD: '$', CZK: 'Kč' }[cur] || '£';
    const numStr = String(val).replace(/[^0-9.]/g, '') || "0.00";
    return cur === 'CZK' ? `${parseInt(numStr)} ${sym}` : `${sym}${numStr}`;
  };

  const isCz = lang === 'cz' || lang === 'cs';
  const isAppOwner = activeRole === 'App Owner';
  const isManager = activeRole === 'Agency Admin' || activeRole === 'Manager';
  const isModel = activeRole === 'Model';



  if (isRelayVariant) {
    return (
      <div style={{ 
        padding: '1.5rem 1rem',
        maxWidth: '100%',
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        <div className="fade-in">
          <WelcomeSection isCz={isCz} user={user} />
          <AlertsSection isCz={isCz} activeSubscription={activeSubscription} agencies={agencies} stats={stats} profiles={_profiles} activeRole={activeRole} />

          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '900', letterSpacing: '0.05em' }}>{(t('dailyAgenda') || 'Daily Agenda').toUpperCase()}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('dailyAgendaDesc')}</p>
          </div>

          {isBackgroundLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', width: '100%', background: 'rgba(255,255,255,0.01)', borderRadius: '24px', border: '1px solid var(--card-border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <Loader2 className="animate-spin" size={32} color="var(--accent-color)" />
                <div className="premium-loading-text" style={{ fontSize: '0.6rem', letterSpacing: '0.2em', opacity: 0.5 }}>SYNCHRONIZING_CORE...</div>
              </div>
            </div>
          ) : (
          <>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>{t('todaysBookings')}</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)', fontWeight: '800' }}>{(calendar || []).length} {t('total').toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(calendar || []).length > 0 ? (calendar || []).map((event, i) => (
                <div key={i} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '15px', borderLeft: `4px solid ${event.status === 'confirmed' ? 'var(--success-color)' : 'var(--accent-color)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '1rem' }}>{event.time}</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{(event.title || '').replace('Meeting w/ ', '')}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '900', color: 'var(--text-secondary)' }}>{event.duration}</div>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button 
                        onClick={(_err) => { _err.stopPropagation(); onDelayBooking(event.id, 15); }}
                        style={{ fontSize: '0.65rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontWeight: '800', cursor: 'pointer' }}
                      >
                        +15m
                      </button>
                      <button 
                        onClick={(_err) => { _err.stopPropagation(); onDelayBooking(event.id, 30); }}
                        style={{ fontSize: '0.65rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontWeight: '800', cursor: 'pointer' }}
                      >
                        +30m
                      </button>
                    </div>
                  </div>
                </div>
              )) : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', gap: '0.75rem', border: '1px dashed var(--card-border)', borderRadius: '12px' }}>
                  <Calendar size={48} color="#374151" />
                  <div style={{ fontSize: '1rem', fontWeight: '700', color: '#64748b' }}>{t('noBookingsToday') || (lang === 'cz' ? 'Dnes žádné rezervace' : 'No bookings for today')}</div>
                  <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                    {lang === 'cz' ? 'Nové rezervace se zobrazí, jakmile budou vytvořeny' : 'New bookings will appear once they are scheduled'}
                  </div>
                </div>}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1rem' }}>{t('quickStats')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('messages').toUpperCase()}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{(stats || {}).totalMessages || 0}</div>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('calls').toUpperCase()}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{(stats || {}).totalCalls || 0}</div>
              </div>
            </div>
          </div>
          </>
          )}
        </div>
      </div>
    );
  }

  const renderSubscriptionBanner = () => {
    if (!activeSubscription) return null;
    const now = new Date();
    const expiresAt = new Date(activeSubscription.expiresAt);
    const daysLeft = Math.max(0, Math.ceil((expiresAt - now) / 86400000));
    const status = activeSubscription.status;
    
    let statusColor = '#6b7280';
    if (status === 'ACTIVE') statusColor = '#10b981';
    else if (status === 'TRIAL') statusColor = '#f59e0b';
    else if (status === 'EXPIRED') statusColor = '#ef4444';

    return (
      <div className="glass-card" style={{ 
        padding: '1rem 1.5rem', 
        marginBottom: '1.5rem', 
        borderLeft: `4px solid ${statusColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShieldCheck size={20} color={statusColor} />
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)' }}>
              {lang === 'cz' ? 'PŘEDPLATNÉ' : 'SUBSCRIPTION'}
            </div>
            <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>
              {activeSubscription.plan}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '800', color: daysLeft <= 7 ? '#ef4444' : 'var(--text-secondary)' }}>
            {lang === 'cz' ? 'Vyprší za' : 'Expires in'} {daysLeft} {lang === 'cz' ? 'dní' : 'days'}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
            {expiresAt.toLocaleDateString(lang === 'cz' ? 'cs-CZ' : 'en-GB')}
          </div>
        </div>
      </div>
    );
  };

  const renderSuperAdmin = () => {
    const statusColor = {
      running: "var(--success-color)",
      active: "var(--success-color)",
      stopped: "var(--_err-color)",
      off: "var(--_err-color)",
    }[vultrStatus?.power_status?.toLowerCase()] ?? "var(--text-secondary)";

    return (
    <div className="fade-in">
      <WelcomeSection isCz={isCz} user={user} />
      <AlertsSection isCz={isCz} activeSubscription={activeSubscription} agencies={agencies} stats={stats} profiles={_profiles} activeRole={activeRole} />

      <div style={{ marginBottom: isMobile ? '1.5rem' : '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-end', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '1rem' : 0 }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '1.75rem' : '2rem', fontWeight: '900', letterSpacing: '0.05em' }}>{(t('globalOverview') || 'Global Overview').toUpperCase()}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.9rem' : '1rem' }}>{t('globalHealthDesc')}</p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '0.5rem', display: 'flex', gap: '0.25rem' }}>
          {['cz', 'eu', 'uk', 'us'].map(market => (
            <button
              key={market}
              data-testid={`market-selector-${market}`}
              onClick={() => nexus.setActiveMarket(market)}
              style={{ padding: '0.4rem 0.8rem', borderRadius: '10px', background: nexus.activeMarket === market ? 'rgba(59, 130, 246, 0.2)' : 'transparent', color: nexus.activeMarket === market ? '#60a5fa' : 'var(--text-secondary)', border: 'none', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
            >
              {market.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {isBackgroundLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', width: '100%', background: 'rgba(255,255,255,0.01)', borderRadius: '24px', border: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Loader2 className="animate-spin" size={40} color="var(--accent-color)" />
            <div className="premium-loading-text" style={{ fontSize: '0.6rem', letterSpacing: '0.2em', opacity: 0.5 }}>HYDRATING_GLOBAL_METRICS...</div>
          </div>
        </div>
      ) : (
      <>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: isMobile ? '1rem' : '1.5rem', marginBottom: isMobile ? '1.5rem' : '3rem' }}>
        {[
          { label: t('totalRevenue'), value: stats?.revenue || '£0.00', icon: <DollarSign color="#10b981" />, growth: stats?.commissionGrowth || 'STABLE', chart: stats?.sparklineData || stats?.chartData || [0,0,0,0,0,0,0] },
          { label: (t('agencies') || 'Agencies').toUpperCase(), value: stats?.totalAgencies || (agencies || []).length, icon: <Building2 color="#3b82f6" />, growth: 'PROD', chart: [0,0,0,0,0,0,0] },
          { label: 'SERVER STATUS', value: (vultrStatus?.power_status || 'CHECKING...').toUpperCase(), icon: <Server color={statusColor} />, growth: vultrStatus?.main_ip || 'PENDING', chart: [0,0,0,0,0,0,0], isStatus: true },
          { label: (t('activeNodes') || 'Active Nodes').toUpperCase(), value: stats?.totalProfiles || '0', icon: <Zap color="#f59e0b" />, growth: 'STABLE', chart: [0,0,0,0,0,0,0] },
          { label: t('globalTraffic').toUpperCase(), value: stats?.totalMessages || '0', icon: <Activity color="#8b5cf6" />, growth: stats?.uptime || '100% UP', chart: stats?.sparklineData || stats?.chartData || [0,0,0,0,0,0,0] }
        ].map((stat, i) => (
          <div key={i} data-testid={`stat-card-${stat.label.toLowerCase().replace(/\s+/g, '-')}`} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', border: stat.isStatus ? `1px solid ${statusColor}40` : '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {stat.icon}
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: stat.isStatus ? statusColor : ((stat.growth || '').startsWith('+') ? 'var(--success-color)' : 'var(--text-secondary)') }}>{stat.growth}</span>
                {!stat.isStatus && (
                  <div style={{ marginTop: '0.25rem' }}>
                    <MiniSparkline data={stat.chart} color={stat.icon.props.color} />
                  </div>
                )}
                {stat.isStatus && vultrStatus && (
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700', marginTop: '0.25rem' }}>
                     {vultrStatus.region}
                   </div>
                )}
              </div>
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{stat.label}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: stat.isStatus ? statusColor : 'inherit' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <TrendingUp size={20} color="var(--accent-color)" /> {t('revenueGrowth') || 'REVENUE GROWTH'}
            </h3>
          </div>
          <div style={{ height: '300px' }}>
            <RevenueLineChart data={stats?.revenueData || stats?.chartData || [0,0,0,0,0,0,0]} />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity size={20} color="#a855f7" /> {t('systemLoad') || 'SYSTEM LOAD OVERVIEW'}
          </h3>
          <div style={{ display: 'flex', justifyContent: 'center', height: '100%', alignItems: 'center' }}>
            <ConversionDonutChart data={[
              { label: 'Active', value: stats?.totalProfiles ? 100 : 0 },
              { label: 'Idle', value: stats?.totalProfiles ? 0 : 100 }
            ]} />
          </div>
        </div>
      </div>
      </>
      )}
    </div>
    );
  };

  const renderManager = () => (
    <div className="fade-in">
      <WelcomeSection isCz={isCz} user={user} />
      <AlertsSection isCz={isCz} activeSubscription={activeSubscription} agencies={agencies} stats={stats} profiles={_profiles} activeRole={activeRole} />

      {!isMobile && (
        <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: '900' }}>{(t('agencyOverview') || 'Agency Overview').toUpperCase()}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>{t('agencyOverviewDesc')}</p>
          </div>
          {isMultiregion && (
             <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.25rem', borderRadius: '10px' }}>
                {['GBP', 'EUR', 'USD', 'CZK'].map(cur => (
                  <button
                    key={cur}
                    data-testid={`currency-selector-${cur}`}
                    onClick={() => setDashboardCurrency(cur)}
                    style={{
                      padding: '0.4rem 0.8rem',
                      borderRadius: '8px',
                      background: dashboardCurrency === cur ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                      color: dashboardCurrency === cur ? '#60a5fa' : 'var(--text-secondary)',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {cur}
                  </button>
                ))}
             </div>
          )}
        </div>
      )}
      
      {isMobile && isMultiregion && (
        <div style={{ marginBottom: '1.5rem', overflowX: 'auto', display: 'flex', paddingBottom: '0.5rem' }}>
           <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.25rem', borderRadius: '10px' }}>
              {['GBP', 'EUR', 'USD', 'CZK'].map(cur => (
                <button
                  key={cur}
                  onClick={() => setDashboardCurrency(cur)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '8px',
                    background: dashboardCurrency === cur ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                    color: dashboardCurrency === cur ? '#60a5fa' : 'var(--text-secondary)',
                    border: 'none',
                    fontSize: '0.7rem',
                    fontWeight: '800'
                  }}
                >
                  {cur}
                </button>
              ))}
           </div>
        </div>
      )}

      {renderSubscriptionBanner()}

      {isBackgroundLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '350px', width: '100%', background: 'rgba(255,255,255,0.01)', borderRadius: '24px', border: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Loader2 className="animate-spin" size={32} color="var(--accent-color)" />
            <div className="premium-loading-text" style={{ fontSize: '0.6rem', letterSpacing: '0.2em', opacity: 0.5 }}>FETCHING_AGENCY_INTEL...</div>
          </div>
        </div>
      ) : (
      <>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), transparent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-color)', marginBottom: '0.5rem' }}>{t('revenueMtd')}</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>{formatMoney(stats?.revenue, dashboardCurrency)}</div>
            </div>
            <MiniSparkline data={stats?.sparklineData || stats?.chartData || [0,0,0,0,0,0,0]} color="var(--accent-color)" />
          </div>
        </div>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('activeOps')}</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>{stats?.totalUsers || '0'}</div>
            </div>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('avgConversion')}</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>{stats?.commissionGrowth || '0%'}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>{t('revenueTrend') || 'REVENUE TREND'}</h3>
          <div style={{ height: '250px' }}>
            <RevenueLineChart data={stats?.revenueData || stats?.chartData || [0,0,0,0,0,0,0]} height={250} />
          </div>
        </div>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.5rem' }}>{t('todaysBookings')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(calendar || []).length > 0 ? (calendar || []).map((event, i) => (
              <div key={i} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '15px', borderLeft: `4px solid ${event.status === 'confirmed' ? 'var(--success-color)' : 'var(--accent-color)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '1rem' }}>{event.time}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{(event.title || '').replace('Meeting w/ ', '')}</div>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: '900', color: 'var(--text-secondary)' }}>{event.duration}</div>
              </div>
            )) : <div style={{ color: 'var(--text-secondary)' }}>{t('noBookingsToday') || 'No bookings for today.'}</div>}
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );

  const renderOperator = () => (
    <div className="fade-in">
      <WelcomeSection isCz={isCz} user={user} />
      <AlertsSection isCz={isCz} activeSubscription={activeSubscription} agencies={agencies} stats={stats} profiles={_profiles} activeRole={activeRole} />

      <div style={{ marginBottom: isMobile ? '1.5rem' : '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-end', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '1rem' : 0 }}>
        <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
          <h2 style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '900' }}>{(t('personalWorkspace') || 'Workspace')}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.85rem' : '1rem' }}>{t('welcomeBack')}, {user?.name || 'User'}.</p>
        </div>
      </div>

      {isBackgroundLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', width: '100%', background: 'rgba(255,255,255,0.01)', borderRadius: '24px', border: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Loader2 className="animate-spin" size={32} color="var(--accent-color)" />
            <div className="premium-loading-text" style={{ fontSize: '0.6rem', letterSpacing: '0.2em', opacity: 0.5 }}>PREPARING_WORKSPACE...</div>
          </div>
        </div>
      ) : (
      <>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 2fr) minmax(300px, 1fr)', gap: isMobile ? '1rem' : '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.5rem', minWidth: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: isMobile ? '1rem' : '1.5rem' }}>
            <div className="glass-card" id="dashboard-stats-messages" style={{ padding: isMobile ? '1rem' : '1.5rem', textAlign: 'center' }}>
               <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: '800', marginBottom: '0.5rem' }}>{t('messages')}</div>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                 <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '900' }}>{stats?.totalMessages || 0}</div>
                 <MiniSparkline data={stats?.sparklineData || stats?.chartData || [0, 0, 0, 0, 0, 0, 0]} color="var(--text-secondary)" width={40} />
               </div>
            </div>
            <div className="glass-card" style={{ padding: isMobile ? '1rem' : '1.5rem', textAlign: 'center', border: '1px solid var(--accent-color)', gridColumn: 'auto' }}>
               <div style={{ color: 'var(--accent-color)', fontSize: '0.7rem', fontWeight: '800', marginBottom: '0.5rem' }}>{(t('bookings') || 'Bookings').toUpperCase()}</div>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                 <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '900' }}>{stats?.totalBookings || 0}</div>
                 <MiniSparkline data={stats?.sparklineData || stats?.chartData || [0, 0, 0, 0, 0, 0, 0]} color="var(--accent-color)" width={40} />
               </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: isMobile ? '1.5rem' : '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
               <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>{t('commissionGrowth')}</h3>
               <span style={{ fontSize: '0.8rem', color: 'var(--success-color)', fontWeight: '700' }}>{stats?.commissionGrowth || 'STABLE'}</span>
            </div>
            <div style={{ height: '200px' }}>
              <RevenueLineChart data={stats?.revenueData || stats?.chartData || [0, 0, 0, 0, 0, 0, 0]} height={200} />
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );

  const renderModel = () => {

    return (
      <div className="fade-in">
        <WelcomeSection isCz={isCz} user={user} />
        <AlertsSection isCz={isCz} activeSubscription={activeSubscription} agencies={agencies} stats={stats} profiles={_profiles} activeRole={activeRole} />

        <div style={{ marginBottom: isMobile ? '1.5rem' : '2rem' }}>
          <SafetyControlCard />
        </div>

        <PendingNotificationsSection isCz={isCz} pendingNotifications={pendingNotifications} setPendingNotifications={setPendingNotifications} onDelayBooking={onDelayBooking} />

        <div style={{ marginBottom: isMobile ? '1.1rem' : '2.5rem' }}>
          <h2 style={{ fontSize: isMobile ? '1.35rem' : '2rem', fontWeight: '900', lineHeight: 1.15 }}>{t('dailyAgenda')}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.9rem' : '1rem', marginTop: isMobile ? '0.35rem' : '0.5rem' }}>{t('dailyAgendaDesc')}</p>
        </div>

      {isBackgroundLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', width: '100%', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Loader2 className="animate-spin" size={24} color="var(--accent-color)" />
            <div className="premium-loading-text" style={{ fontSize: '0.6rem', letterSpacing: '0.15em', opacity: 0.5 }}>LOADING_AGENDA...</div>
          </div>
        </div>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '2rem' }}>
        <div className="glass-card" style={{ padding: isMobile ? '1.15rem' : '2rem' }}>
          <h3 style={{ fontSize: isMobile ? '0.95rem' : '1.1rem', fontWeight: '800', marginBottom: isMobile ? '0.9rem' : '1.5rem' }}>{t('todaysBookings')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(calendar || []).length > 0 ? (calendar || []).map((event, i) => (
              <div key={i} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '15px', borderLeft: `4px solid ${event.status === 'confirmed' ? 'var(--success-color)' : 'var(--accent-color)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '1rem' }}>{event.time}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{(event.title || '').replace('Meeting w/ ', '')}</div>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: '900', color: 'var(--text-secondary)' }}>{event.duration}</div>
              </div>
            )) : <div style={{ color: 'var(--text-secondary)' }}>{t('noBookingsToday') || 'No bookings for today.'}</div>}
          </div>
        </div>
      </div>
      )}
    </div>
    );
  };

  return (
    <div style={{ 
      padding: isMobile ? '0.75rem 0.9rem 2rem' : '3rem 3rem 6rem',
      maxWidth: '1400px',
      margin: '0 auto',
      width: '100%',
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {isAppOwner ? renderSuperAdmin() : (isManager ? renderManager() : (isModel ? renderModel() : renderOperator()))}
    </div>
  );
};

export default DashboardHome;

const WelcomeSection = ({ isCz, user }) => (
  <div style={{ marginBottom: '1.5rem' }}>
    <h2 id="dashboard-welcome-title" style={{ fontSize: '1.5rem', fontWeight: '900', margin: 0 }}>👋 {isCz ? 'Vítejte zpět' : 'Welcome back'}, {user?.name || 'User'}!</h2>
    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>{new Date().toLocaleDateString(isCz ? 'cs-CZ' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>
);

const AlertsSection = ({ isCz, activeSubscription, agencies, stats, profiles, activeRole }) => {
  const alerts = [];
  if (activeSubscription) {
    const now = new Date();
    const expiresAt = new Date(activeSubscription?.expiresAt || now);
    const daysLeft = Math.max(0, Math.ceil((expiresAt - now) / 86400000));
    const status = activeSubscription?.status;
    if (status === 'EXPIRED') {
      alerts.push({ message: isCz ? 'Vaše předplatné vypršelo! Obnovte ho pro pokračování.' : 'Your subscription has expired! Renew to continue.', color: '#ef4444' });
    } else if (status === 'TRIAL' && daysLeft < 7) {
      alerts.push({ message: isCz ? `Zkušební doba končí za ${daysLeft} dní` : `Trial expires in ${daysLeft} days`, color: '#f59e0b' });
    }
  }
  const myAgency = (agencies || [])?.[0];
  const hasProfilesInAgency = (stats?.totalProfiles || 0) > 0 || (stats?.activeProfiles || 0) > 0 || (myAgency?.totalProfiles || 0) > 0;
  
  if (!hasProfilesInAgency && (profiles || []).length === 0 && (activeRole === 'App Owner' || activeRole === 'Agency Admin' || activeRole === 'Manager')) {
    alerts.push({ message: isCz ? 'Vytvořte svůj první profil a začněte' : 'Create your first profile to get started', color: '#3b82f6' });
  }
  if (alerts.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
      {alerts.map((a, i) => (
        <div key={i} className="glass-card" style={{ padding: '0.85rem 1.25rem', borderLeft: `4px solid ${a.color}`, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={18} color={a.color} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: a.color }}>{a.message}</span>
        </div>
      ))}
    </div>
  );
};

const SkeletonStatsGrid = ({ columns = 3, isMobile }) => (
  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(${columns}, 1fr)`, gap: '1.5rem', marginBottom: '1.5rem' }}>
    {Array.from({ length: columns }).map((_, i) => (
      <div key={i} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <Skeleton width="40px" height="40px" borderRadius="10px" />
        <Skeleton width="60%" height="12px" />
        <Skeleton width="40%" height="24px" />
        <div className="premium-loading-text" style={{ fontSize: '0.6rem', marginTop: 'auto' }}>HYDRATING...</div>
      </div>
    ))}
  </div>
);

const PendingNotificationsSection = ({ isCz, pendingNotifications, setPendingNotifications, showToast }) => {
  if (!pendingNotifications || pendingNotifications.length === 0) return null;
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ fontSize: '0.8rem', fontWeight: '800', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', letterSpacing: '0.05em' }}>
        <MessageSquare size={16} />
        {(isCz ? 'NÁVRHY SMS PRO KLIENTY' : 'PENDING CLIENT SMS').toUpperCase()}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {pendingNotifications.map((notif, i) => (
          <div key={i} className="glass-card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #f59e0b', background: 'rgba(245, 158, 11, 0.03)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{notif.clientName} <span style={{ color: 'var(--text-secondary)', fontWeight: '400', fontSize: '0.75rem' }}>({notif.oldTime} → {notif.newTime})</span></div>
              <button 
                onClick={() => setPendingNotifications(prev => prev.filter((_, idx) => idx !== i))}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem' }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              "{notif.message}"
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(notif.message);
                showToast(isCz ? 'Zkopírováno do schránky' : 'Copied to clipboard', 'success');
              }}
              style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: '800', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer' }}
            >
              <Copy size={14} />
              {isCz ? 'KOPÍROVAT TEXT' : 'COPY TEXT'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
