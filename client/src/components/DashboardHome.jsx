import React from 'react';
import { DollarSign, Building2, Zap, Activity, TrendingUp, Users, Server, ShieldCheck } from 'lucide-react';
import { RevenueLineChart, ConversionDonutChart, MiniSparkline } from './AnalyticsCharts';
import { useVultr } from '../hooks/useVultr';

const DashboardHome = ({ user, t, lang, agencies = [], profiles = [], calendar = [], isShiftActive, setIsShiftActive, isMobile, stats = {}, activeSubscription }) => {
  const { status: vultrStatus } = useVultr();

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
      <div style={{ marginBottom: isMobile ? '1.5rem' : '2.5rem', paddingRight: isMobile ? 'calc(0.5rem + env(safe-area-inset-right))' : 0, paddingLeft: isMobile ? 'calc(0.5rem + env(safe-area-inset-left))' : 0 }}>
        <h2 style={{ fontSize: isMobile ? '1.75rem' : '2rem', fontWeight: '900', letterSpacing: '0.05em' }}>{t('globalOverview').toUpperCase()}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.9rem' : '1rem' }}>{t('globalHealthDesc')}</p>
      </div>

      {renderSubscriptionBanner()}
      
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: isMobile ? '1rem' : '1.5rem', marginBottom: isMobile ? '1.5rem' : '3rem' }}>
        {[
          { label: t('totalRevenue'), value: stats.revenue || '£0.00', icon: <DollarSign color="#10b981" />, growth: stats.commissionGrowth || 'STABLE', chart: stats.chartData || [0,0,0,0,0,0,0] },
          { label: (t('agencies') || 'Agencies').toUpperCase(), value: stats.totalAgencies || (agencies || []).length, icon: <Building2 color="#3b82f6" />, growth: 'PROD', chart: [0,0,0,0,0,0,0] },
          { label: 'SERVER STATUS', value: (vultrStatus?.power_status || 'CHECKING...').toUpperCase(), icon: <Server color={statusColor} />, growth: vultrStatus?.main_ip || 'PENDING', chart: [0,0,0,0,0,0,0], isStatus: true },
          { label: (t('activeNodes') || 'Active Nodes').toUpperCase(), value: stats.totalProfiles || '0', icon: <Zap color="#f59e0b" />, growth: 'STABLE', chart: [0,0,0,0,0,0,0] },
          { label: t('globalTraffic').toUpperCase(), value: stats.totalMessages || '0', icon: <Activity color="#8b5cf6" />, growth: stats.uptime || '100% UP', chart: stats.chartData || [0,0,0,0,0,0,0] }
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
            <RevenueLineChart data={stats.chartData || [0,0,0,0,0,0,0]} />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity size={20} color="#a855f7" /> {t('systemLoad') || 'SYSTEM LOAD OVERVIEW'}
          </h3>
          <div style={{ display: 'flex', justifyContent: 'center', height: '100%', alignItems: 'center' }}>
            <ConversionDonutChart data={[
              { label: 'Active', value: stats.totalProfiles ? 100 : 0 },
              { label: 'Idle', value: stats.totalProfiles ? 0 : 100 }
            ]} />
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>{t('infraTopology')}</h3>
        <div style={{ height: '200px', background: 'rgba(0,0,0,0.2)', borderRadius: '15px', border: '1px dashed var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
           {t('mapViz') || 'Global Infrastructure Map Enabled'}
        </div>
      </div>
    </div>
  ); };

  const renderManager = () => (
    <div className="fade-in">
      <div style={{ marginBottom: isMobile ? '1.5rem' : '2.5rem', paddingRight: isMobile ? 'calc(0.5rem + env(safe-area-inset-right))' : 0, paddingLeft: isMobile ? 'calc(0.5rem + env(safe-area-inset-left))' : 0 }}>
        <h2 style={{ fontSize: isMobile ? '1.75rem' : '2rem', fontWeight: '900' }}>{t('agencyOverview').toUpperCase()}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.9rem' : '1rem' }}>{t('agencyOverviewDesc')}</p>
      </div>

      {renderSubscriptionBanner()}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), transparent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-color)', marginBottom: '0.5rem' }}>{t('revenueMtd')}</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>{stats.revenue || '£0.00'}</div>
            </div>
            <MiniSparkline data={stats.chartData || [0,0,0,0,0,0,0]} color="var(--accent-color)" />
          </div>
        </div>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('activeOps')}</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>{stats.totalUsers || '0'}</div>
            </div>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('avgConversion')}</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>{stats.commissionGrowth || '0%'}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>{t('revenueTrend') || 'REVENUE TREND'}</h3>
          <div style={{ height: '250px' }}>
            <RevenueLineChart data={stats.chartData || [0,0,0,0,0,0,0]} height={250} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderOperator = () => (
    <div className="fade-in">
      <div style={{ marginBottom: isMobile ? '1.5rem' : '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-end', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '1rem' : 0 }}>
        <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
          <h2 style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '900' }}>{t('personalWorkspace')}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.85rem' : '1rem' }}>{t('welcomeBack')}, {user.name}.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 2fr) minmax(300px, 1fr)', gap: isMobile ? '1rem' : '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.5rem', minWidth: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: isMobile ? '1rem' : '1.5rem' }}>
            <div className="glass-card" style={{ padding: isMobile ? '1rem' : '1.5rem', textAlign: 'center' }}>
               <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: '800', marginBottom: '0.5rem' }}>{t('messages')}</div>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                 <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '900' }}>{stats.totalMessages || 0}</div>
                 <MiniSparkline data={stats.chartData || [0, 0, 0, 0, 0, 0, 0]} color="var(--text-secondary)" width={40} />
               </div>
            </div>
            <div className="glass-card" style={{ padding: isMobile ? '1rem' : '1.5rem', textAlign: 'center', border: '1px solid var(--accent-color)', gridColumn: 'auto' }}>
               <div style={{ color: 'var(--accent-color)', fontSize: '0.7rem', fontWeight: '800', marginBottom: '0.5rem' }}>{t('bookings').toUpperCase()}</div>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                 <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '900' }}>{stats.totalBookings || 0}</div>
                 <MiniSparkline data={stats.chartData || [0, 0, 0, 0, 0, 0, 0]} color="var(--accent-color)" width={40} />
               </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: isMobile ? '1.5rem' : '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
               <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>{t('commissionGrowth')}</h3>
               <span style={{ fontSize: '0.8rem', color: 'var(--success-color)', fontWeight: '700' }}>{stats.commissionGrowth || 'STABLE'}</span>
            </div>
            <div style={{ height: '200px' }}>
              <RevenueLineChart data={stats.chartData || [0, 0, 0, 0, 0, 0, 0]} height={200} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderModel = () => (
    <div className="fade-in">
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '900' }}>{t('dailyAgenda')}</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{t('dailyAgendaDesc')}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '2rem' }}>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.5rem' }}>{t('todaysBookings')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {calendar.length > 0 ? calendar.map((event, i) => (
              <div key={i} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '15px', borderLeft: `4px solid ${event.status === 'confirmed' ? 'var(--success-color)' : 'var(--accent-color)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '1rem' }}>{event.time}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{event.title}</div>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: '900', color: 'var(--text-secondary)' }}>{event.duration}</div>
              </div>
            )) : <div style={{ color: 'var(--text-secondary)' }}>{t('noBookingsToday') || 'No bookings for today.'}</div>}
          </div>
        </div>
      </div>
    </div>
  );

  if (!user) return null;
  const activeRole = user.role;
  const isAppOwner = activeRole === 'App Owner' || user.isAppOwner;
  const isManager = activeRole === 'Agency Admin' || activeRole === 'Manager';
  const isModel = activeRole === 'Model' || user.isModel;

  return (
    <div style={{ 
      padding: isMobile ? '1.25rem 1rem' : '3rem', 
      maxWidth: '1400px', 
      margin: '0 auto',
      width: '100%',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {isAppOwner ? renderSuperAdmin() : (isManager ? renderManager() : (isModel ? renderModel() : renderOperator()))}
    </div>
  );
};

export default DashboardHome;
