import React, { useState } from "react";
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
  AlertCircle
} from 'lucide-react';

function InfraTab({ t }) {
  const { status, bandwidth, loading, cmdOutput, error, serverAction, runCommand, gitPull } = useVultr();
  const [command, setCommand] = useState("");
  const [repoPath, setRepoPath] = useState("~/app");

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

  return (
    <div className="infra-tab-container fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
      
      {error && (
        <div className="glass-card" style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '0.75rem', borderRadius: '12px' }}>
          <AlertCircle size={20} color="var(--error-color)" />
          <div style={{ fontSize: '0.85rem', color: 'var(--error-color)', fontWeight: '600' }}>{error}</div>
        </div>
      )}

      {/* Server Status Header */}
      <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', background: 'var(--accent-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Server size={22} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Vultr VPS Instance</h2>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>ID: {status?.id || '---'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 1rem', borderRadius: '30px', border: '1px solid var(--card-border)' }}>
             <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor }}></div>
             <span style={{ fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', color: statusColor }}>{status?.power_status || 'UNKNOWN'}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
             <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '700' }}>IP ADDRESS</div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: '700' }}>
               <Globe size={14} color="var(--accent-color)" />
               {status?.main_ip || '---'}
             </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
             <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '700' }}>OS / REGION</div>
             <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>{status?.os} / {status?.region}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
             <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '700' }}>vCPU / RAM</div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: '700' }}>
               <Cpu size={14} color="var(--accent-color)" />
               {status?.vcpu_count} vCPU / {status?.ram} MB
             </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
             <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '700' }}>BANDWIDTH</div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: '700' }}>
               <Activity size={14} color="var(--accent-color)" />
               {bandwidth ? `${formatBytes(bandwidth.incoming_bytes)} ↓ / ${formatBytes(bandwidth.outgoing_bytes)} ↑` : '---'}
             </div>
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '20px' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '1rem', letterSpacing: '0.05em' }}>SERVER ACTIONS</h3>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={() => serverAction("start")} 
            disabled={loading || status?.power_status === 'running'}
            className="action-button success"
            style={{ 
              flex: 1, padding: '0.8rem', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: 'var(--success-color)', fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: (loading || status?.power_status === 'running') ? 0.5 : 1
            }}
          >
            <Play size={16} fill="currentColor" /> START
          </button>
          <button 
            onClick={() => serverAction("stop")} 
            disabled={loading || status?.power_status === 'stopped'}
            className="action-button error"
            style={{ 
              flex: 1, padding: '0.8rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--error-color)', fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: (loading || status?.power_status === 'stopped') ? 0.5 : 1
            }}
          >
            <Square size={16} fill="currentColor" /> STOP
          </button>
          <button 
            onClick={() => serverAction("restart")} 
            disabled={loading}
            className="action-button warning"
            style={{ 
              flex: 1, padding: '0.8rem', borderRadius: '12px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)', color: '#eab308', fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: loading ? 0.5 : 1
            }}
          >
            <RefreshCcw size={16} /> RESTART
          </button>
        </div>
      </div>

      {/* Deployment & Commands */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1.5rem' }}>
        {/* Git Pull Section */}
        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '20px' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '1rem', letterSpacing: '0.05em' }}>CONTINUOUS DEPLOYMENT</h3>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1, position: 'relative' }}>
               <input 
                value={repoPath} 
                onChange={e => setRepoPath(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '0.75rem 0.75rem 0.75rem 2.5rem', color: 'white', fontSize: '0.85rem', boxSizing: 'border-box' }}
                placeholder="Repository path (e.g. ~/app)"
              />
              <Database size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
            <button 
              onClick={() => gitPull(repoPath)}
              style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', background: 'var(--accent-color)', border: 'none', color: 'white', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Github size={16} /> GIT PULL
            </button>
          </div>
        </div>

        {/* SSH Console */}
        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>SSH REMOTE CONSOLE</h3>
            <Terminal size={18} color="var(--text-secondary)" />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input 
              value={command} 
              onChange={e => setCommand(e.target.value)}
              onKeyDown={e => e.key === "Enter" && runCommand(command)}
              style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '0.75rem 1rem', color: '#10b981', fontSize: '0.85rem', fontFamily: 'monospace' }}
              placeholder="Enter SSH command..."
            />
            <button 
              onClick={() => runCommand(command)}
              style={{ padding: '0.75rem 1.25rem', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#d8b4fe', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              RUN
            </button>
          </div>
          {cmdOutput && (
            <div style={{ background: '#000', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(16, 185, 129, 0.2)', position: 'relative' }}>
               <pre style={{ margin: 0, fontSize: '0.75rem', fontFamily: 'monospace', color: '#10b981', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                {cmdOutput}
              </pre>
              <button 
                onClick={() => setCmdOutput("")}
                style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', color: 'rgba(16, 185, 129, 0.5)', cursor: 'pointer', fontSize: '0.7rem' }}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InfraTab;
