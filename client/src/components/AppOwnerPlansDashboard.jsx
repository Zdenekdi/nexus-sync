import React, { useState, useEffect } from 'react';
import { 
  Wallet, Users, TrendingUp, ArrowUpRight, 
  CreditCard, Activity, Calendar, Download,
  ExternalLink, ArrowDownRight, Zap, Target,
  Settings
} from 'lucide-react';
import axios from 'axios';

import { useNexus } from '../context/ContextHook';
import ServerMaintenanceTab from './ServerMaintenanceTab';
import SystemHealthTab from './SystemHealthTab';

const AppOwnerPlansDashboard = () => {
  const nexus = useNexus();
  const { lang, token, API_BASE, activeMarket, setActiveMarket } = nexus;
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('billing');
  const isMobile = window.innerWidth < 768;

  const getCurrencySymbol = (m) => {
    switch(m?.toLowerCase()) {
      case 'cz': return 'Kč';
      case 'eu': return '€';
      case 'uk': return '£';
      case 'us': return '$';
      default: return 'Kč';
    }
  };

  const getApiCurrency = (m) => {
    switch(m?.toLowerCase()) {
      case 'cz': return 'CZK';
      case 'eu': return 'EUR';
      case 'uk': return 'GBP';
      case 'us': return 'USD';
      default: return 'CZK';
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const r = await axios.get(`${API_BASE}/subscriptions/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(r.data);
      } catch (_err) {
        console.error('Failed to fetch admin stats:', _err);
      } finally {
        setLoading(false);
      }
    };

    if (token && API_BASE) {
      fetchStats();
    }
  }, [API_BASE, token]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
      <div className="loading-spinner"></div>
    </div>
  );

  const currentMRR = stats?.revenueByCurrency?.[getApiCurrency(activeMarket)] || 0;

  const tabs = [
    { id: 'billing', label: lang === 'cz' ? 'Správa Plateb' : 'Billing Management', icon: <CreditCard size={18} /> },
    { id: 'health', label: lang === 'cz' ? 'Stav Systému' : 'System Health', icon: <Activity size={18} /> },
    { id: 'maintenance', label: lang === 'cz' ? 'Údržba Serveru' : 'Server Maintenance', icon: <Settings size={18} /> }
  ];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem' }}>
      
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid var(--card-border)',
        overflow: 'auto'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '1rem',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: activeTab === tab.id ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? '700' : '600',
              fontSize: '0.95rem',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-color)' : '2px solid transparent',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-color)'}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'billing' ? (
        <BillingContent 
          lang={lang}
          isMobile={isMobile}
          stats={stats}
          activeMarket={activeMarket}
          setActiveMarket={setActiveMarket}
          getCurrencySymbol={getCurrencySymbol}
          getApiCurrency={getApiCurrency}
          currentMRR={currentMRR}
        />
      ) : activeTab === 'health' ? (
        <SystemHealthTab nexus={nexus} />
      ) : (
        <ServerMaintenanceTab lang={lang} />
      )}
    </div>
  );
};

const BillingContent = ({
  lang, isMobile, stats, activeMarket, setActiveMarket,
  getCurrencySymbol, _getApiCurrency, currentMRR
}) => (
  <>
    {/* Header Info */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '1rem', flexDirection: isMobile ? 'column' : 'row', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '900', background: 'linear-gradient(to right, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
          {lang === 'cz' ? 'Administrace Plateb' : 'Billing Administration'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {lang === 'cz' ? 'Kompletní přehled tržeb, aktivních tarifů a transakční historie celé platformy.' : 'Complete overview of revenue, active plans, and platform-wide transaction history.'}
        </p>
      </div>

      {/* Market Switcher */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '0.5rem', display: 'flex', gap: '0.25rem' }}>
        {['cz', 'eu', 'uk', 'us'].map(market => (
          <button
            key={market}
            onClick={() => setActiveMarket(market)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              background: activeMarket === market ? 'var(--accent-color)' : 'transparent',
              color: activeMarket === market ? 'white' : 'var(--text-secondary)',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {market.toUpperCase()} ({getCurrencySymbol(market)})
          </button>
        ))}
      </div>
    </div>

    {/* Header Stat Cards */}
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '1rem' }}>
      <StatCard 
        icon={<Wallet color="#10b981" />}
        label={lang === 'cz' ? 'MRR' : 'MRR'}
        value={`${currentMRR.toLocaleString()} ${getCurrencySymbol(activeMarket)}`}
        trend="+12%"
        trendUp={true}
      />
      <StatCard 
        icon={<Users color="#6366f1" />}
        label={lang === 'cz' ? 'Aktivní' : 'Active'}
        value={stats?.activeSubscriptions || 0}
        trend="+5"
        trendUp={true}
      />
      <StatCard 
        icon={<Activity color="#f59e0b" />}
        label={lang === 'cz' ? 'Konverze' : 'Conv.'}
        value="14.2%"
        trend="-0.4%"
        trendUp={false}
      />
      <StatCard 
        icon={<Target color="#ec4899" />}
        label={lang === 'cz' ? 'Trially' : 'Trials'}
        value={stats?.planDistribution?.TRIAL || 0}
        trend="Stable"
        trendUp={null}
      />
    </div>

    {/* Main Content Area */}
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '2rem' }}>
      
      {/* Left column: Recent Transactions */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>
            {lang === 'cz' ? 'Transakční Historie' : 'Transaction History'}
          </h3>
          <button className="status-badge" style={{ fontSize: '0.6rem', cursor: 'pointer', border: '1px solid var(--card-border)' }}>
            <Download size={10} style={{ marginRight: '0.3rem' }} /> EXPORT
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 0', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>AGENTURA</th>
                <th style={{ padding: '0.75rem 0', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>TARIF</th>
                <th style={{ padding: '0.75rem 0', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>ČÁSTKA</th>
                <th style={{ padding: '0.75rem 0', fontSize: '0.65rem', color: 'var(--text-secondary)', textAlign: 'right' }}>STAV</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentTransactions?.map((tx) => (
                <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '1rem 0', fontWeight: '700', fontSize: '0.85rem' }}>{tx.agencyName}</td>
                  <td style={{ padding: '1rem 0' }}>
                    <span style={{ 
                      fontSize: '0.7rem', padding: '0.15rem 0.45rem', background: 'rgba(99,102,241,0.1)', 
                      color: 'var(--accent-color)', borderRadius: '4px', fontWeight: '800' 
                    }}>
                      {tx.plan}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 0', fontWeight: '800', fontSize: '0.85rem' }}>{tx.amount?.toLocaleString()} {tx.currency}</td>
                  <td style={{ padding: '1rem 0', textAlign: 'right' }}>
                    <span style={{ 
                      fontSize: '0.6rem', padding: '0.15rem 0.4rem', borderRadius: '4px',
                      background: tx.status === 'ACTIVE' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                      color: tx.status === 'ACTIVE' ? '#10b981' : 'var(--text-secondary)',
                      border: `1px solid ${tx.status === 'ACTIVE' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)'}`
                    }}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right column: Distribution & Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Plan Distribution */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1.25rem' }}>
            {lang === 'cz' ? 'Popularita Tarifů' : 'Plan Popularity'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <ProgressItem label="Annual" count={stats?.planDistribution?.ANNUAL || 0} total={stats?.activeSubscriptions} color="#10b981" />
            <ProgressItem label="Semi-Annual" count={stats?.planDistribution?.SEMI_ANNUAL || 0} total={stats?.activeSubscriptions} color="#6366f1" />
            <ProgressItem label="Monthly" count={stats?.planDistribution?.MONTHLY || 0} total={stats?.activeSubscriptions} color="#a855f7" />
            <ProgressItem label="Trial" count={stats?.planDistribution?.TRIAL || 0} total={stats?.activeSubscriptions} color="#f59e0b" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(168,85,247,0.05))' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1.25rem' }}>
            {lang === 'cz' ? 'Rychlé Akce' : 'Quick Actions'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <ActionButton icon={<Zap size={14} />} label={lang === 'cz' ? 'Darovat Trial' : 'Gift Trial'} color="var(--accent-color)" />
            <ActionButton icon={<Download size={14} />} label={lang === 'cz' ? 'Reporty' : 'Reports'} color="#10b981" />
          </div>
        </div>

      </div>
    </div>
  </>
);

const StatCard = ({ icon, label, value, trend, trendUp }) => (
  <div className="glass-card" style={{ padding: '1.25rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
      <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>{icon}</div>
      {trend && (
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '0.1rem', fontSize: '0.65rem', fontWeight: '800',
          color: trendUp === null ? 'var(--text-secondary)' : trendUp ? '#10b981' : '#ef4444'
        }}>
          {trendUp === true && <ArrowUpRight size={12} />}
          {trendUp === false && <ArrowDownRight size={12} />}
          {trend}
        </div>
      )}
    </div>
    <div style={{ fontSize: '1.25rem', fontWeight: '900', marginBottom: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: '800', letterSpacing: '0.05em' }}>{label.toUpperCase()}</div>
  </div>
);

const ProgressItem = ({ label, count, total, color }) => {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
        <span style={{ fontWeight: '700' }}>{label}</span>
        <span style={{ color: 'var(--text-secondary)' }}>{count}</span>
      </div>
      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
        <div style={{ width: `${percentage}%`, height: '100%', background: color, borderRadius: '10px', boxShadow: `0 0 8px ${color}44` }}></div>
      </div>
    </div>
  );
};

const ActionButton = ({ icon, label, color }) => (
  <button style={{ 
    display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1rem',
    background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}33`, borderRadius: '10px',
    color: 'white', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left',
    transition: 'all 0.2s'
  }} className="hover-scale">
    {React.cloneElement(icon, { color })}
    {label}
  </button>
);

export default AppOwnerPlansDashboard;
