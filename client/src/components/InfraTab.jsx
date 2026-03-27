import React, { useState, useRef } from "react";
import { useVultr } from "../hooks/useVultr";
import { 
  Server, 
  Play, 
  Square, 
  RefreshCcw, 
  Activity, 
  Terminal, 
  Github, 
  Cpu, 
  Database, 
  Globe,
  AlertCircle,
  CreditCard,
  Zap,
  Layout,
  Upload,
  Download,
  Smartphone,
  CheckCircle2
} from 'lucide-react';

function InfraTab({ t }) {
  const { status, bandwidth, stats, loading, cmdOutput, clearCmdOutput, error, serverAction, runCommand, gitPull, apkInfo, uploadApk, uploadProgress } = useVultr();
  const [command, setCommand] = useState("");
  const [repoPath, setRepoPath] = useState("~/app");
  const [apkError, setApkError] = useState(null);
  const [apkSuccess, setApkSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const statusColor = {
    running: "var(--success-color)",
    active: "var(--success-color)",
    stopped: "var(--error-color)",
    off: "var(--error-color)",
    pending: "var(--accent-color)",
    starting: "var(--accent-color)",
    stopping: "var(--accent-color)",
  }[status?.power_status?.toLowerCase()] ?? "var(--text-secondary)";

  const formatBytes = (bytes) => {
    if (!bytes) return "0 GB";
    return (bytes / 1e9).toFixed(2) + " GB";
  };

  const statCards = [
    { label: 'Vultr Charges', value: '$' + (status?.pending_charges ?? '0.00'), icon: <CreditCard size={18} />, color: '#10b981', sub: 'Current Month' },
    { label: 'System Uptime', value: stats?.uptime || '99.9%', icon: <Zap size={18} />, color: '#f59e0b', sub: 'All nodes healthy' },
    { label: 'Data Transfer', value: bandwidth ? formatBytes(bandwidth.outgoing_bytes) : '0 GB', icon: <Activity size={18} />, color: '#6366f1', sub: 'Outgoing' }
  ];

  return (
    <div className="infra-tab-container fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
      
      {error && (
        <div className="glass-card" style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '0.75rem', borderRadius: '12px' }}>
          <AlertCircle size={20} color="var(--error-color)" />
          <div style={{ fontSize: '0.85rem', color: 'var(--error-color)', fontWeight: '600' }}>{error}</div>
        </div>
      )}

      {/* 1. Global Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        {statCards.map((card, i) => (
          <div key={i} className="glass-card" style={{ padding: '1.25rem', borderRadius: '15px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '40px', height: '40px', borderRadius: '50%', background: card.color, opacity: 0.1 }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ color: card.color }}>{card.icon}</div>
              <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{card.value}</div>
            <div style={{ fontSize: '0.65rem', color: card.color, fontWeight: '700', marginTop: '0.25rem' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        
        {/* 2. Vultr Management Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Status & Info Card */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Layout size={18} color="var(--accent-color)" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: '800', letterSpacing: '0.05em' }}>INSTANCE DETAILS</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.8rem', borderRadius: '30px', border: '1px solid var(--card-border)' }}>
                 <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor }}></div>
                 <span style={{ fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', color: statusColor }}>{status?.power_status || 'OFFLINE'}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                 <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700' }}>IP ADDRESS</div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: '700' }}>
                   <Globe size={14} color="var(--accent-color)" />
                   {status?.main_ip || '---'}
                 </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                 <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700' }}>OS / REGION</div>
                 <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{status?.os} / {status?.region}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                 <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700' }}>RESOURCES</div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: '700' }}>
                   <Cpu size={14} color="var(--accent-color)" />
                   {status?.vcpu_count} vCPU • {status?.ram} MB
                 </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                 <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700' }}>BANDWIDTH</div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: '700' }}>
                   <Activity size={14} color="var(--accent-color)" />
                   {bandwidth ? `${formatBytes(bandwidth.outgoing_bytes)} ↑` : '---'}
                 </div>
              </div>
            </div>
          </div>

          {/* Power Controls Card */}
          <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '20px' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '1rem', letterSpacing: '0.05em' }}>POWER OPERATIONS</h3>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                onClick={() => serverAction("start")} 
                disabled={loading || status?.power_status === 'running'}
                className="action-button success"
                style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: 'var(--success-color)', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: (loading || status?.power_status === 'running') ? 0.3 : 1 }}
              >
                <Play size={14} fill="currentColor" /> START
              </button>
              <button 
                onClick={() => serverAction("stop")} 
                disabled={loading || status?.power_status === 'stopped'}
                className="action-button error"
                style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--error-color)', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: (loading || status?.power_status === 'stopped') ? 0.3 : 1 }}
              >
                <Square size={14} fill="currentColor" /> STOP
              </button>
              <button 
                onClick={() => serverAction("restart")} 
                disabled={loading}
                className="action-button warning"
                style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)', color: '#eab308', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: loading ? 0.3 : 1 }}
              >
                <RefreshCcw size={14} /> RESTART
              </button>
            </div>
          </div>
        </div>

        {/* 3. Operations Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Git Dashboard */}
          <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Github size={18} color="var(--text-secondary)" />
              <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>CONTINUOUS DEPLOYMENT</h3>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                 <input 
                  value={repoPath} 
                  onChange={e => setRepoPath(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '0.7rem 0.7rem 0.7rem 2.2rem', color: 'white', fontSize: '0.8rem', boxSizing: 'border-box' }}
                  placeholder="Path (~/app)"
                />
                <Database size={14} color="var(--text-secondary)" style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
              <button 
                onClick={() => gitPull(repoPath)}
                disabled={loading}
                style={{ padding: '0.7rem 1.25rem', borderRadius: '12px', background: 'var(--accent-color)', border: 'none', color: 'white', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: loading ? 0.5 : 1 }}
              >
                <Github size={14} /> PULL
              </button>
            </div>
          </div>

          {/* SSH Remote Terminal */}
          <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Terminal size={18} color="var(--text-secondary)" />
                <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>REMOTE SSH CONSOLE</h3>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input 
                value={command} 
                onChange={e => setCommand(e.target.value)}
                onKeyDown={e => e.key === "Enter" && runCommand(command)}
                style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '0.7rem 1rem', color: '#10b981', fontSize: '0.8rem', fontFamily: 'monospace' }}
                placeholder="root@vultr:~# command"
              />
              <button 
                onClick={() => runCommand(command)}
                disabled={loading}
                style={{ padding: '0.7rem 1.25rem', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#d8b4fe', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
              >
                RUN
              </button>
            </div>
            {cmdOutput && (
              <div style={{ background: '#000', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(16, 185, 129, 0.2)', position: 'relative', flex: 1, maxHeight: '200px', overflowY: 'auto' }}>
                 <pre style={{ margin: 0, fontSize: '0.7rem', fontFamily: 'monospace', color: '#10b981', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                  {cmdOutput}
                </pre>
                <button 
                  onClick={clearCmdOutput}
                  style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', color: 'rgba(16, 185, 129, 0.5)', cursor: 'pointer', fontSize: '0.65rem' }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
          {/* APK Management */}
          <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Smartphone size={18} color="var(--text-secondary)" />
              <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>RELAY APK</h3>
            </div>

            {/* Current APK Info */}
            {apkInfo?.available ? (
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CheckCircle2 size={13} /> APK dostupné</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    {(apkInfo.size / 1024 / 1024).toFixed(1)} MB · {new Date(apkInfo.uploadedAt).toLocaleDateString('cs-CZ')}
                  </div>
                </div>
                <a href={apkInfo.downloadUrl} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.8rem', borderRadius: '8px', background: 'rgba(16,185,129,0.15)', color: 'var(--success-color)', fontSize: '0.72rem', fontWeight: '800', textDecoration: 'none' }}>
                  <Download size={13} /> Stáhnout
                </a>
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontStyle: 'italic' }}>Žádné APK na serveru</div>
            )}

            {/* Upload */}
            <input ref={fileInputRef} type="file" accept=".apk" style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setApkError(null); setApkSuccess(false);
                try { await uploadApk(file); setApkSuccess(true); setTimeout(() => setApkSuccess(false), 4000); }
                catch(err) { setApkError(err.response?.data?.error || err.message); }
                e.target.value = '';
              }}
            />

            {uploadProgress !== null ? (
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', height: '8px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'var(--accent-color)', transition: 'width 0.2s', borderRadius: '10px' }} />
              </div>
            ) : null}

            {apkError && <div style={{ fontSize: '0.72rem', color: 'var(--error-color)', marginBottom: '0.5rem' }}>{apkError}</div>}
            {apkSuccess && <div style={{ fontSize: '0.72rem', color: 'var(--success-color)', marginBottom: '0.5rem' }}>✓ APK nahráno úspěšně</div>}

            <button onClick={() => fileInputRef.current?.click()} disabled={uploadProgress !== null}
              style={{ width: '100%', padding: '0.7rem', borderRadius: '12px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: uploadProgress !== null ? 0.5 : 1 }}>
              <Upload size={14} /> {uploadProgress !== null ? `Nahrávám... ${uploadProgress}%` : 'Nahrát novou verzi APK'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InfraTab;
