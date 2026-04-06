import React from 'react';
import { DollarSign, Building2, Zap, Activity, TrendingUp, Users, Server, ShieldCheck, AlertTriangle, Calendar } from 'lucide-react';
import { RevenueLineChart, ConversionDonutChart, MiniSparkline } from './AnalyticsCharts';
import { useVultr } from '../hooks/useVultr';
import { useNexus } from '../context/NexusContext';

const DashboardHome = () => {
  const nexus = useNexus();
  const { 
    activeOperator: user, t, lang, agencies, profiles: _profiles, 
    calendar, stats, activeSubscription, isRelayVariant, activeRole,
    isMobile
  } = nexus;
  
  const { status: vultrStatus } = useVultr();

  const isCz = lang === 'cz' || lang === 'cs';

  const WelcomeSection = () => (
    <div style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '900', margin: 0 }}>👋 {isCz ? 'Vítejte zpět' : 'Welcome back'}, {user?.name || 'User'}!</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>{new Date().toLocaleDateString(isCz ? 'cs-CZ' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
  );

  const AlertsSection = () => {
    const alerts = [];
    if (activeSubscription) {
      const now = new Date();
      const expiresAt = new Date(activeSubscription.expiresAt);
      const daysLeft = Math.max(0, Math.ceil((expiresAt - now) / 86400000));
      const status = activeSubscription.status;
      if (status === 'EXPIRED') {
        alerts.push({ message: isCz ? 'Vaše předplatné vypršelo! Obnovte ho pro pokračování.' : 'Your subscription has expired! Renew to continue.', color: '#ef4444' });
      } else if (status === 'TRIAL' && daysLeft < 7) {
        alerts.push({ message: isCz ? `Zkušební doba končí za ${daysLeft} dní` : `Trial expires in ${daysLeft} days`, color: '#f59e0b' });
      }
    }
    if ((_profiles || []).length === 0) {
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

  const SkeletonCard = ({ height = '80px', style: extra }) => (
    <div className="skeleton" style={{ height, borderRadius: '15px', ...extra }} />
  );

  const SkeletonGrid = ({ columns = 3 }) => (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(${columns}, 1fr)`, gap: '1.5rem', marginBottom: '1.5rem' }}>
      {Array.from({ length: columns }).map((_, i) => <SkeletonCard key={i} height="120px" />)}
    </div>
  );

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
          <WelcomeSection />
          <AlertsSection />

          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '900', letterSpacing: '0.05em' }}>{(t('dailyAgenda') || 'Daily Agenda').toUpperCase()}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('dailyAgendaDesc')}</p>
          </div>

          {stats === null || stats === undefined ? (
            <>
              <SkeletonCard height="200px" style={{ marginBottom: '1.5rem' }} />
              <SkeletonGrid columns={2} />
            </>
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
                  <div style={{ fontSize: '0.75rem', fontWeight: '900', color: 'var(--text-secondary)' }}>{event.duration}</div>
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
      stopped: "var(--error-color)",
      off: "var(--error-color)",
    }[vultrStatus?.power_status?.toLowerCase()] ?? "var(--text-secondary)";

    return (
    <div className="fade-in">
      <WelcomeSection />
      <AlertsSection />

      <div style={{ marginBottom: isMobile ? '1.5rem' : '2.5rem' }}>
        <h2 style={{ fontSize: isMobile ? '1.75rem' : '2rem', fontWeight: '900', letterSpacing: '0.05em' }}>{(t('globalOverview') || 'Global Overview').toUpperCase()}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.9rem' : '1rem' }}>{t('globalHealthDesc')}</p>
      </div>

      {stats === null || stats === undefined ? (
        <>
          <SkeletonGrid columns={isMobile ? 1 : 5} />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
            <SkeletonCard height="340px" />
            <SkeletonCard height="340px" />
          </div>
        </>
      ) : (
      <>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: isMobile ? '1rem' : '1.5rem', marginBottom: isMobile ? '1.5rem' : '3rem' }}>
        {[
          { label: t('totalRevenue'), value: (stats || {}).revenue || '£0.00', icon: <DollarSign color="#10b981" />, growth: (stats || {}).commissionGrowth || 'STABLE', chart: (stats || {}).sparklineData || (stats || {}).chartData || [0,0,0,0,0,0,0] },
          { label: (t('agencies') || 'Agencies').toUpperCase(), value: (stats || {}).totalAgencies || (agencies || []).length, icon: <Building2 color="#3b82f6" />, growth: 'PROD', chart: [0,0,0,0,0,0,0] },
          { label: 'SERVER STATUS', value: (vultrStatus?.power_status || 'CHECKING...').toUpperCase(), icon: <Server color={statusColor} />, growth: vultrStatus?.main_ip || 'PENDING', chart: [0,0,0,0,0,0,0], isStatus: true },
          { label: (t('activeNodes') || 'Active Nodes').toUpperCase(), value: (stats || {}).totalProfiles || '0', icon: <Zap color="#f59e0b" />, growth: 'STABLE', chart: [0,0,0,0,0,0,0] },
          { label: t('globalTraffic').toUpperCase(), value: (stats || {}).totalMessages || '0', icon: <Activity color="#8b5cf6" />, growth: (stats || {}).uptime || '100% UP', chart: (stats || {}).sparklineData || (stats || {}).chartData || [0,0,0,0,0,0,0] }
        ].map((stat, i) => (
          <div key={i} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', border: stat.isStatus ? `1px solid ${statusColor}40` : '1px solid var(--card-border)' }}>
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
            <RevenueLineChart data={(stats || {}).revenueData || (stats || {}).chartData || [0,0,0,0,0,0,0]} />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity size={20} color="#a855f7" /> {t('systemLoad') || 'SYSTEM LOAD OVERVIEW'}
          </h3>
          <div style={{ display: 'flex', justifyContent: 'center', height: '100%', alignItems: 'center' }}>
            <ConversionDonutChart data={[
              { label: 'Active', value: (stats || {}).totalProfiles ? 100 : 0 },
              { label: 'Idle', value: (stats || {}).totalProfiles ? 0 : 100 }
            ]} />
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  ); };

  const renderManager = () => (
    <div className="fade-in">
      <WelcomeSection />
      <AlertsSection />

      <div style={{ marginBottom: isMobile ? '1.5rem' : '2.5rem' }}>
        <h2 style={{ fontSize: isMobile ? '1.75rem' : '2rem', fontWeight: '900' }}>{(t('agencyOverview') || 'Agency Overview').toUpperCase()}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.9rem' : '1rem' }}>{t('agencyOverviewDesc')}</p>
      </div>

      {renderSubscriptionBanner()}

      {stats === null || stats === undefined ? (
        <>
          <SkeletonGrid columns={isMobile ? 1 : 3} />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
            <SkeletonCard height="300px" />
            <SkeletonCard height="300px" />
          </div>
        </>
      ) : (
      <>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), transparent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-color)', marginBottom: '0.5rem' }}>{t('revenueMtd')}</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>{(stats || {}).revenue || '£0.00'}</div>
            </div>
            <MiniSparkline data={(stats || {}).sparklineData || (stats || {}).chartData || [0,0,0,0,0,0,0]} color="var(--accent-color)" />
          </div>
        </div>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('activeOps')}</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>{(stats || {}).totalUsers || '0'}</div>
            </div>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('avgConversion')}</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>{(stats || {}).commissionGrowth || '0%'}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>{t('revenueTrend') || 'REVENUE TREND'}</h3>
          <div style={{ height: '250px' }}>
            <RevenueLineChart data={(stats || {}).revenueData || (stats || {}).chartData || [0,0,0,0,0,0,0]} height={250} />
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
      <WelcomeSection />
      <AlertsSection />

      <div style={{ marginBottom: isMobile ? '1.5rem' : '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-end', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '1rem' : 0 }}>
        <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
          <h2 style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '900' }}>{(t('personalWorkspace') || 'Workspace')}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.85rem' : '1rem' }}>{t('welcomeBack')}, {user?.name}.</p>
        </div>
      </div>

      {stats === null || stats === undefined ? (
        <>
          <SkeletonGrid columns={isMobile ? 1 : 2} />
          <SkeletonCard height="260px" />
        </>
      ) : (
      <>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 2fr) minmax(300px, 1fr)', gap: isMobile ? '1rem' : '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.5rem', minWidth: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: isMobile ? '1rem' : '1.5rem' }}>
            <div className="glass-card" style={{ padding: isMobile ? '1rem' : '1.5rem', textAlign: 'center' }}>
               <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: '800', marginBottom: '0.5rem' }}>{t('messages')}</div>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                 <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '900' }}>{(stats || {}).totalMessages || 0}</div>
                 <MiniSparkline data={(stats || {}).sparklineData || (stats || {}).chartData || [0, 0, 0, 0, 0, 0, 0]} color="var(--text-secondary)" width={40} />
               </div>
            </div>
            <div className="glass-card" style={{ padding: isMobile ? '1rem' : '1.5rem', textAlign: 'center', border: '1px solid var(--accent-color)', gridColumn: 'auto' }}>
               <div style={{ color: 'var(--accent-color)', fontSize: '0.7rem', fontWeight: '800', marginBottom: '0.5rem' }}>{(t('bookings') || 'Bookings').toUpperCase()}</div>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                 <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '900' }}>{(stats || {}).totalBookings || 0}</div>
                 <MiniSparkline data={(stats || {}).sparklineData || (stats || {}).chartData || [0, 0, 0, 0, 0, 0, 0]} color="var(--accent-color)" width={40} />
               </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: isMobile ? '1.5rem' : '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
               <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>{t('commissionGrowth')}</h3>
               <span style={{ fontSize: '0.8rem', color: 'var(--success-color)', fontWeight: '700' }}>{(stats || {}).commissionGrowth || 'STABLE'}</span>
            </div>
            <div style={{ height: '200px' }}>
              <RevenueLineChart data={(stats || {}).revenueData || (stats || {}).chartData || [0, 0, 0, 0, 0, 0, 0]} height={200} />
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );

  const renderModel = () => (
    <div className="fade-in">
      <WelcomeSection />
      <AlertsSection />

      <div style={{ marginBottom: isMobile ? '1.1rem' : '2.5rem' }}>
        <h2 style={{ fontSize: isMobile ? '1.35rem' : '2rem', fontWeight: '900', lineHeight: 1.15 }}>{t('dailyAgenda')}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.9rem' : '1rem', marginTop: isMobile ? '0.35rem' : '0.5rem' }}>{t('dailyAgendaDesc')}</p>
      </div>

      {stats === null || stats === undefined ? (
        <SkeletonCard height="200px" />
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

  if (!user) return null;
  const isAppOwner = activeRole === 'App Owner';
  const isManager = activeRole === 'Agency Admin' || activeRole === 'Manager';
  const isModel = activeRole === 'Model';

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
