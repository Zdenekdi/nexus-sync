import React, { useState, useEffect } from 'react';
import { 
  Activity, Cpu, HardDrive, Clock, 
  RefreshCw, Server, Shield, Zap,
  ArrowUpRight, ArrowDownRight, CheckCircle, AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import { useNexus } from '../context/ContextHook';

const SystemHealthTab = ({ server }) => {
  const nexus = useNexus();
  const { lang, token, API_BASE, t } = nexus;
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isMainHub = !server || server.id === 'main-hub';

  const fetchHealth = async () => {
    if (!isMainHub) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const r = await axios.get(`${API_BASE}/admin/health`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHealth(r.data);
      setError(null);
    } catch (_err) {
      console.error('Failed to fetch system health:', _err);
      setError(lang === 'cz' ? 'Nepodařilo se načíst data ze serveru.' : 'Failed to fetch server data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    if (isMainHub) {
      const interval = setInterval(fetchHealth, 30000);
      return () => clearInterval(interval);
    }
  }, [server, isMainHub]);

  if (loading && !health) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
      <div className="loading-spinner"></div>
    </div>
  );

  if (error && !health) return (
    <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', border: '1px solid var(--_err-color)' }}>
      <AlertTriangle size={48} color="var(--_err-color)" style={{ marginBottom: '1rem' }} />
      <p style={{ color: 'var(--_err-color)', fontWeight: '700' }}>{error}</p>
      <button onClick={fetchHealth} className="action-btn" style={{ marginTop: '1rem', background: 'var(--accent-color)' }}>
        <RefreshCw size={14} style={{ marginRight: '0.5rem' }} /> {t('retry') || 'Zkusit znovu'}
      </button>
    </div>
  );

  const isMobile = window.innerWidth < 768;

  if (!isMainHub) return (
    <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
      <Server size={64} color="var(--accent-color)" style={{ marginBottom: '1.5rem', opacity: 0.5 }} />
      <h3 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '1rem' }}>
        {lang === 'cz' ? 'Vzdálený Monitorování Uzlu' : 'Remote Node Monitoring'}
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '500px', margin: '0 auto' }}>
        {lang === 'cz' 
          ? `Sledování výkonu pro uzel "${server.name}" (${server.ip}) zatím není v centrálním API nakonfigurováno. Tato funkce bude dostupná v příští aktualizaci infrastruktury.`
          : `Performance monitoring for node "${server.name}" (${server.ip}) is not yet configured in the central API. This feature will be available in the next infrastructure update.`}
      </p>
      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
        <div style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem', fontWeight: '800' }}>
          REGION: {server.region}
        </div>
        <div style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem', fontWeight: '800' }}>
          TYPE: {server.type}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Real-time Status Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '900', background: 'linear-gradient(to right, #10b981, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
            {t('realTimeStatus')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {t('monitoringNote')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} className="pulse"></div>
          <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#10b981' }}>SYSTEM OPERATIONAL</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '1rem' }}>
        <HealthStatCard 
          icon={<Cpu color="#6366f1" />}
          label={t('cpuLoad')}
          value={`${health?.cpu?.loadAvg[0]}`}
          subtitle={`${health?.cpu?.cores} ${t('cores')}`}
          color="#6366f1"
        />
        <HealthStatCard 
          icon={<Activity color="#10b981" />}
          label={t('ramUsage')}
          value={`${health?.memory?.percent}%`}
          subtitle={`${health?.memory?.used} / ${health?.memory?.total}`}
          color="#10b981"
        />
        <HealthStatCard 
          icon={<HardDrive color="#f59e0b" />}
          label={t('diskSpace')}
          value={health?.disk?.percent || 'N/A'}
          subtitle={`${health?.disk?.used} / ${health?.disk?.total}`}
          color="#f59e0b"
        />
        <HealthStatCard 
          icon={<Clock color="#ec4899" />}
          label={t('uptime')}
          value={`${health?.uptime?.days}${t('days').charAt(0)} ${health?.uptime?.hours}h`}
          subtitle={`${health?.uptime?.minutes} ${t('minutes')}`}
          color="#ec4899"
        />
      </div>

      {/* System Details & Info */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1.2fr', gap: '2rem' }}>
        
        {/* Resource Usage Visualization */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Zap size={20} color="var(--accent-color)" /> {t('serverMetrics')}
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <UsageBar 
              label={t('cpuLoad')} 
              percent={Math.min(100, parseFloat(health?.cpu?.loadAvg[0] || 0) * 10)} 
              value={health?.cpu?.loadAvg[0]}
              color="var(--accent-color)" 
            />
            <UsageBar 
              label={t('ramUsage')} 
              percent={parseFloat(health?.memory?.percent || 0)} 
              value={`${health?.memory?.used} / ${health?.memory?.total}`}
              color="#10b981" 
            />
            <UsageBar 
              label={t('diskSpace')} 
              percent={parseInt(health?.disk?.percent || 0)} 
              value={`${health?.disk?.used} / ${health?.disk?.total}`}
              color="#f59e0b" 
            />
          </div>
        </div>

        {/* System Information */}
        <div className="glass-card" style={{ padding: '2rem', background: 'rgba(0,0,0,0.2)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.5rem' }}>
            {t('platform')} Info
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <InfoRow label="Kernel" value={`${health?.platform} ${health?.release}`} />
            <InfoRow label="Arch" value={health?.arch} />
            <InfoRow label="Node.js" value={health?.nodeVersion} />
            <InfoRow label="VCPU" value={health?.cpu?.cores} />
            <InfoRow label="CPU Model" value={health?.cpu?.model} />
            <div style={{ marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--card-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                <RefreshCw size={12} className={loading ? "spin-animation" : ""} />
                Last updated: {new Date(health?.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

const HealthStatCard = ({ icon, label, value, subtitle, color }) => (
  <div className="glass-card" style={{ padding: '1.5rem', border: `1px solid ${color}15` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
      <div style={{ padding: '0.6rem', background: `${color}10`, borderRadius: '12px' }}>{icon}</div>
      <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>{label.toUpperCase()}</div>
    </div>
    <div style={{ fontSize: '1.75rem', fontWeight: '900', color: 'white', marginBottom: '0.25rem' }}>{value}</div>
    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>{subtitle}</div>
  </div>
);

const UsageBar = ({ label, percent, value, color }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{label.toUpperCase()}</div>
        <div style={{ fontSize: '1rem', fontWeight: '900' }}>{value}</div>
      </div>
      <div style={{ fontSize: '1.25rem', fontWeight: '900', color: percent > 90 ? 'var(--_err-color)' : percent > 75 ? 'var(--warning-color)' : 'white' }}>{Math.round(percent)}%</div>
    </div>
    <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', padding: '2px' }}>
      <div style={{ width: `${percent}%`, height: '100%', background: color, borderRadius: '10px', transition: 'width 1s ease-out', boxShadow: `0 0 10px ${color}44` }}></div>
    </div>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>{label}</span>
    <span style={{ fontSize: '0.85rem', color: 'white', fontWeight: '700', textAlign: 'right' }}>{value}</span>
  </div>
);

export default SystemHealthTab;
