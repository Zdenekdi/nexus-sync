import React from 'react';
import { DollarSign, Building2, Zap, Activity, TrendingUp, Users } from 'lucide-react';
import { RevenueLineChart, ConversionDonutChart, MiniSparkline } from './AnalyticsCharts';
import { MOCK_CHART_DATA, MOCK_CONVERSION_DATA, MOCK_STATS } from '../DemoData';

const DashboardHome = ({ user, t, agencies = [], profiles = [], calendar = [], isShiftActive, setIsShiftActive, isMobile }) => {
  
  const renderSuperAdmin = () => (
    <div className="fade-in">
      <div style={{ marginBottom: isMobile ? '1.5rem' : '2.5rem', paddingRight: isMobile ? 'calc(0.5rem + env(safe-area-inset-right))' : 0, paddingLeft: isMobile ? 'calc(0.5rem + env(safe-area-inset-left))' : 0 }}>
        <h2 style={{ fontSize: isMobile ? '1.75rem' : '2rem', fontWeight: '900', letterSpacing: '0.05em' }}>{t('globalOverview').toUpperCase()}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.9rem' : '1rem' }}>{t('globalHealthDesc')}</p>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: isMobile ? '1rem' : '1.5rem', marginBottom: isMobile ? '1.5rem' : '3rem' }}>
        {[
          { label: t('totalRevenue'), value: '$842,500', icon: <DollarSign color="#10b981" />, growth: '+12.5%', chart: MOCK_STATS.revenue.chart },
          { label: (t('agencies') || 'Agencies').toUpperCase(), value: (agencies || []).length, icon: <Building2 color="#3b82f6" />, growth: '+2', chart: [10, 12, 11, 13, 12, 14, 14] },
          { label: (t('activeNodes') || 'Active Nodes').toUpperCase(), value: '14', icon: <Zap color="#f59e0b" />, growth: 'HEALTHY', chart: [14, 14, 13, 14, 14, 14, 14] },
          { label: t('globalTraffic').toUpperCase(), value: '2.4M', icon: <Activity color="#8b5cf6" />, growth: '85% LOAD', chart: MOCK_STATS.engagement.chart }
        ].map((stat, i) => (
          <div key={i} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {stat.icon}
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: (stat.growth || '').startsWith('+') ? 'var(--success-color)' : 'var(--text-secondary)' }}>{stat.growth}</span>
                <div style={{ marginTop: '0.25rem' }}>
                  <MiniSparkline data={stat.chart} color={stat.icon.props.color} />
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{stat.label}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <TrendingUp size={20} color="var(--accent-color)" /> {t('revenueGrowth') || 'REVENUE GROWTH'}
            </h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <select className="glass-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}><option>Last 14 Days</option></select>
            </div>
          </div>
          <div style={{ height: '300px' }}>
            <RevenueLineChart data={MOCK_CHART_DATA} />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Users size={20} color="#a855f7" /> {t('conversionOverview') || 'CONVERSION OVERVIEW'}
          </h3>
          <div style={{ display: 'flex', justifyContent: 'center', height: '100%', alignItems: 'center' }}>
            <ConversionDonutChart data={MOCK_CONVERSION_DATA} />
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>{t('infraTopology')}</h3>
        <div style={{ height: '200px', background: 'rgba(0,0,0,0.2)', borderRadius: '15px', border: '1px dashed var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
           {t('mapViz')}
        </div>
      </div>
    </div>
  );

  const renderManager = () => (
    <div className="fade-in">
      <div style={{ marginBottom: isMobile ? '1.5rem' : '2.5rem', paddingRight: isMobile ? 'calc(0.5rem + env(safe-area-inset-right))' : 0, paddingLeft: isMobile ? 'calc(0.5rem + env(safe-area-inset-left))' : 0 }}>
        <h2 style={{ fontSize: isMobile ? '1.75rem' : '2rem', fontWeight: '900' }}>{t('agencyOverview').toUpperCase()}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.9rem' : '1rem' }}>{t('agencyOverviewDesc')}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), transparent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-color)', marginBottom: '0.5rem' }}>{t('revenueMtd')}</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>$42,850</div>
            </div>
            <MiniSparkline data={[1200, 1500, 1400, 1800, 2100, 1900, 2400]} color="var(--accent-color)" />
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--success-color)', fontWeight: '700', marginTop: '0.5rem' }}>↑ 18% {t('vsLastMonth')}</div>
        </div>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('activeOps')}</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>8 / 12</div>
            </div>
            <MiniSparkline data={[6, 8, 7, 9, 8, 10, 8]} color="var(--text-secondary)" />
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>4 {t('currentlyOffline')}</div>
        </div>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('avgConversion')}</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>24%</div>
            </div>
            <MiniSparkline data={[18, 22, 21, 25, 24, 26, 24]} color="var(--success-color)" />
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--success-color)', fontWeight: '700', marginTop: '0.5rem' }}>{t('optimalRange')}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>{t('revenueTrend') || 'REVENUE TREND'}</h3>
          <div style={{ height: '250px' }}>
            <RevenueLineChart data={MOCK_CHART_DATA.slice(-7)} height={250} />
          </div>
        </div>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>{t('recentReviewsQA')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: '700' }}>{t('profileReview')}: Diana</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>"Great communication, very professional."</div>
                </div>
                <div style={{ color: '#f59e0b', fontWeight: '900' }}>5.0 ★</div>
              </div>
            ))}
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
        <button 
          onClick={() => setIsShiftActive?.(!isShiftActive)}
          style={{ 
            padding: '0.6rem 1.25rem', 
            background: isShiftActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
            color: isShiftActive ? 'var(--success-color)' : '#ef4444', 
            borderRadius: '10px', 
            fontSize: '0.85rem', 
            fontWeight: '800', 
            border: '1px solid currentColor',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {isShiftActive ? t('shiftActive') : t('shiftOffline')}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: isMobile ? '1rem' : '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? '1rem' : '1.5rem' }}>
            <div className="glass-card" style={{ padding: isMobile ? '1rem' : '1.5rem', textAlign: 'center' }}>
               <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: '800', marginBottom: '0.5rem' }}>{t('messages')}</div>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                 <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '900' }}>142</div>
                 <MiniSparkline data={[10, 15, 8, 22, 18, 25, 14]} color="var(--text-secondary)" width={40} />
               </div>
            </div>
            <div className="glass-card" style={{ padding: isMobile ? '1rem' : '1.5rem', textAlign: 'center' }}>
               <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: '800', marginBottom: '0.5rem' }}>{t('calls')}</div>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                 <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '900' }}>18</div>
                 <MiniSparkline data={[1, 3, 0, 4, 2, 5, 2]} color="var(--text-secondary)" width={40} />
               </div>
            </div>
            <div className="glass-card" style={{ padding: isMobile ? '1rem' : '1.5rem', textAlign: 'center', border: '1px solid var(--accent-color)', gridColumn: 'auto' }}>
               <div style={{ color: 'var(--accent-color)', fontSize: '0.7rem', fontWeight: '800', marginBottom: '0.5rem' }}>{t('commission')}</div>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                 <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '900' }}>$185</div>
                 <MiniSparkline data={[15, 25, 20, 35, 30, 45, 18]} color="var(--accent-color)" width={40} />
               </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: isMobile ? '1.5rem' : '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
               <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>{t('commissionGrowth') || 'COMMISSION GROWTH'}</h3>
               <span style={{ fontSize: '0.8rem', color: 'var(--success-color)', fontWeight: '700' }}>+24% {t('thisWeek') || 'this week'}</span>
            </div>
            <div style={{ height: '200px' }}>
              <RevenueLineChart data={MOCK_CHART_DATA.slice(-7)} height={200} />
            </div>
          </div>

          <div className="glass-card" style={{ padding: isMobile ? '1.5rem' : '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.5rem', textAlign: isMobile ? 'center' : 'left' }}>{t('assignedProfiles')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
               {profiles.slice(0, 4).map(p => (
                 <div key={p.id} className="glass-card" style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}>
                   <div style={{ width: '40px', height: '40px', background: 'var(--accent-color)', borderRadius: '10px', margin: '0 auto 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>{p.name[0]}</div>
                   <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{p.name}</div>
                 </div>
               ))}
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
           <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1.5rem' }}>{t('syncStatusCap')}</h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
             {['AdultWork', 'ErosGuide', 'ThePunter'].map(platform => (
               <div key={platform} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{platform}</div>
                 <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success-color)', boxShadow: '0 0 10px var(--success-color)' }}></div>
               </div>
             ))}
           </div>
           <button style={{ width: '100%', marginTop: '2rem', padding: '0.85rem', background: 'var(--accent-color)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: '800', cursor: 'pointer' }}>{t('syncAllNow')}</button>
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
            {calendar.map((event, i) => (
              <div key={i} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '15px', borderLeft: `4px solid ${event.status === 'confirmed' ? 'var(--success-color)' : 'var(--accent-color)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '1rem' }}>{event.time}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{event.title}</div>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: '900', color: 'var(--text-secondary)' }}>{event.duration}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '2rem', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), transparent)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
               <div>
                 <div style={{ color: '#f59e0b', fontSize: '0.7rem', fontWeight: '800', marginBottom: '0.5rem' }}>{t('earningsWeek')}</div>
                 <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>$2,140</div>
               </div>
               <div style={{ textAlign: 'right' }}>
                 <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('goal')}: $3,000</div>
                 <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: '800', marginTop: '0.25rem' }}>71% COMPLETE</div>
               </div>
             </div>
             <div style={{ height: '150px' }}>
               <RevenueLineChart data={MOCK_CHART_DATA.slice(-7)} height={150} color="#f59e0b" />
             </div>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem' }}>
             <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1.25rem' }}>{t('latestReview')}</h3>
             <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1rem' }}>
                "Absolutely professional and amazing session. Highly recommended for everyone looking for quality."
             </div>
             <div style={{ textAlign: 'right', fontWeight: '800', color: 'var(--accent-color)' }}>- James W.</div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!user) return null;
  const isAdminOrManager = user.isAdmin || user.role === 'Agency Manager' || user.role === 'Regional Manager' || user.role === 'Manager' || user.role === 'Admin';

  return (
    <div style={{ 
      padding: isMobile ? '1.25rem 1rem' : '3rem', 
      maxWidth: '1400px', 
      margin: '0 auto',
      width: '100%',
      overflowX: 'hidden'
    }}>
      {user.isSuperAdmin ? renderSuperAdmin() : (isAdminOrManager ? renderManager() : (user.isModel || user.role === 'Model' ? renderModel() : renderOperator()))}
    </div>
  );
};

export default DashboardHome;
