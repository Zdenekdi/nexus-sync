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

import { useNexus } from '../context/ContextHook';

function InfraTab() {
  const { 
    lang, 
    showToast, 
    selectedServerId, 
    setSelectedServerId, 
    availableServers 
  } = useNexus();
  const { status, bandwidth, stats, loading, cmdOutput, clearCmdOutput, _err, serverAction, runCommand, gitPull, apkInfo, uploadApk, uploadProgress } = useVultr();
  
  const selectedServer = availableServers.find(s => s.id === selectedServerId) || availableServers[0];
  const isMainHub = selectedServer.id === 'main-hub';

  const handleServerChange = (id) => {
    setSelectedServerId(id);
    showToast(lang === 'cz' ? `Server přepnut na: ${availableServers.find(s => s.id === id)?.name}` : `Server switched to: ${availableServers.find(s => s.id === id)?.name}`, 'info');
  };
  const [command, setCommand] = useState("");
  const [repoPath, setRepoPath] = useState("~/nexus-backend");
  const [apkError, setApkError] = useState(null);
  const [apkSuccess, setApkSuccess] = useState(false);
  const [apkVersion, setApkVersion] = useState("1.0");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleApkFile = async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.apk')) { setApkError('Pouze soubory .apk jsou povoleny'); return; }
    setApkError(null); setApkSuccess(false);
    try { await uploadApk(file, apkVersion); setApkSuccess(true); setTimeout(() => setApkSuccess(false), 4000); }
    catch (_err) { setApkError(_err.response?.data?.error || _err.message); }
  };

  const statusColor = {
    running: "var(--success-color)",
    active: "var(--success-color)",
    stopped: "var(--_err-color)",
    off: "var(--_err-color)",
    pending: "var(--accent-color)",
    starting: "var(--accent-color)",
    stopping: "var(--accent-color)",
  }[status?.power_status?.toLowerCase()] ?? "var(--text-secondary)";

  const formatBytes = (bytes) => {
    if (!bytes) return "0 GB";
    return (bytes / 1e9).toFixed(2) + " GB";
  };

  const statCards = [
    { label: 'Náklady (Vultr)', value: '$' + (status?.pending_charges ?? '0.00'), icon: <CreditCard size={18} />, color: '#10b981', sub: 'Aktuální měsíc' },
    { label: 'Dostupnost systému', value: stats?.uptime || '99.9%', icon: <Zap size={18} />, color: '#f59e0b', sub: 'Všechny uzly OK' },
    { label: 'Přenos dat', value: bandwidth ? formatBytes(bandwidth.outgoing_bytes) : '0 GB', icon: <Activity size={18} />, color: '#6366f1', sub: 'Odchozí provoz' }
  ];

  return (
    <div className="infra-tab-container fade-in" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '2.5rem', 
      padding: '2.5rem', 
      height: '100%', 
      overflowY: 'auto', 
      boxSizing: 'border-box',
      width: '100%'
    }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '-1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '900', letterSpacing: '-0.02em' }}>
            {lang === 'cz' ? 'Správa Infrastruktury' : 'Infrastructure Management'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {lang === 'cz' ? 'Monitorování a ovládání fyzických a cloudových uzlů.' : 'Monitoring and control of physical and cloud nodes.'}
          </p>
        </div>

        {/* Server Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '0.5rem' }}>
            {lang === 'cz' ? 'AKTIVNÍ UZEL' : 'ACTIVE NODE'}
          </span>
          <div style={{ position: 'relative' }}>
            <select 
              value={selectedServerId}
              onChange={(e) => handleServerChange(e.target.value)}
              style={{
                appearance: 'none',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--card-border)',
                borderRadius: '12px',
                padding: '0.6rem 2.5rem 0.6rem 1rem',
                color: 'white',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: 'pointer',
                outline: 'none',
                minWidth: '220px'
              }}
            >
              {availableServers.map(server => (
                <option key={server.id} value={server.id} style={{ background: '#111', color: 'white' }}>
                  {server.name} ({server.ip})
                </option>
              ))}
            </select>
            <Server size={14} color="var(--accent-color)" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      {_err && (
        <div className="glass-card" style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '0.75rem', borderRadius: '12px' }}>
          <AlertCircle size={20} color="var(--_err-color)" />
          <div style={{ fontSize: '0.85rem', color: 'var(--_err-color)', fontWeight: '600' }}>{_err}</div>
        </div>
      )}

      {!isMainHub && (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
          <Server size={48} color="var(--accent-color)" style={{ marginBottom: '1.5rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: '900', marginBottom: '0.75rem' }}>
            {lang === 'cz' ? 'Vzdálená Správa Uzlu' : 'Remote Node Management'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto' }}>
            {lang === 'cz' 
              ? `Vzdálené ovládání (Vultr API) a SSH terminál pro uzel "${selectedServer.name}" zatím nejsou propojeny s tímto panelem. Správa je zatím možná pouze pro hlavní Hub.`
              : `Remote control (Vultr API) and SSH terminal for node "${selectedServer.name}" are not yet linked to this panel. Management is currently available for the primary Hub only.`}
          </p>
        </div>
      )}

      {isMainHub && (
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
      )}

      {isMainHub && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        
        {/* 2. Vultr Management Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Status & Info Card */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Layout size={18} color="var(--accent-color)" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: '800', letterSpacing: '0.05em' }}>DETAILY SERVERU</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.8rem', borderRadius: '30px', border: '1px solid var(--card-border)' }}>
                 <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor }}></div>
                 <span style={{ fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', color: statusColor }}>{status?.power_status || 'NEAKTIVNÍ'}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                 <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700' }}>IP ADRESA</div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: '700' }}>
                   <Globe size={14} color="var(--accent-color)" />
                   {status?.main_ip || '---'}
                 </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                 <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700' }}>SYSTÉM / REGION</div>
                 <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{status?.os} / {status?.region}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                 <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700' }}>VÝKON / ZDROJE</div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: '700' }}>
                   <Cpu size={14} color="var(--accent-color)" />
                   {status?.vcpu_count} vCPU • {status?.ram} MB
                 </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                 <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700' }}>PŘENOS DAT</div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: '700' }}>
                   <Activity size={14} color="var(--accent-color)" />
                   {bandwidth ? `${formatBytes(bandwidth.outgoing_bytes)} ↑` : '---'}
                 </div>
              </div>
            </div>
          </div>

          {/* Power Controls Card */}
          <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '20px' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '1rem', letterSpacing: '0.05em' }}>NAPÁJENÍ A RESTART</h3>
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
                className="action-button _err"
                style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--_err-color)', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: (loading || status?.power_status === 'stopped') ? 0.3 : 1 }}
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
              <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>KONTINUÁLNÍ NASAZENÍ (GIT)</h3>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                 <input 
                  value={repoPath} 
                  onChange={_err => setRepoPath(_err.target.value)}
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
                <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>VZDÁLENÝ SSH TERMINÁL</h3>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input 
                value={command} 
                onChange={_err => setCommand(_err.target.value)}
                onKeyDown={_err => _err.key === "Enter" && runCommand(command)}
                style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '0.7rem 1rem', color: '#10b981', fontSize: '0.8rem', fontFamily: 'monospace' }}
                placeholder="root@vultr:~# command"
              />
              <button 
                onClick={() => runCommand(command)}
                disabled={loading}
                style={{ padding: '0.7rem 1.25rem', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#d8b4fe', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
              >
                SPUSTIT
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
                  Smazat
                </button>
              </div>
            )}
          </div>
          {/* APK Management */}
          <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Smartphone size={18} color="var(--text-secondary)" />
              <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>ANDROID RELAY (APK)</h3>
            </div>

            {/* Current APK Info */}
            {apkInfo?.available ? (
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CheckCircle2 size={13} /> APK na serveru</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    {(apkInfo.size / 1024 / 1024).toFixed(1)} MB · Nahráno {new Date(apkInfo.uploadedAt).toLocaleDateString('cs-CZ')}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '0.15rem', wordBreak: 'break-all' }}>{apkInfo.downloadUrl}</div>
                </div>
                <a href={apkInfo.downloadUrl} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.8rem', borderRadius: '8px', background: 'rgba(16,185,129,0.15)', color: 'var(--success-color)', fontSize: '0.72rem', fontWeight: '800', textDecoration: 'none', whiteSpace: 'nowrap', marginLeft: '0.75rem' }}>
                  <Download size={13} /> Stáhnout
                </a>
              </div>
            ) : (
              <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Smartphone size={13} /> Aktuální stažení</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>nexus-sync-8d50b.web.app/device-setup</div>
                </div>
                <a href="https://nexus-sync-8d50b.web.app/device-setup" target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.8rem', borderRadius: '8px', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontSize: '0.72rem', fontWeight: '800', textDecoration: 'none', whiteSpace: 'nowrap', marginLeft: '0.75rem' }}>
                  <Download size={13} /> Stránka
                </a>
              </div>
            )}

            <input ref={fileInputRef} type="file" accept=".apk" style={{ display: 'none' }}
              onChange={async (_err) => {
                await handleApkFile(_err.target.files?.[0]);
                _err.target.value = '';
              }}
            />

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Verze:</span>
              <input
                value={apkVersion}
                onChange={_err => setApkVersion(_err.target.value)}
                placeholder="1.0"
                style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '0.35rem 0.6rem', color: 'white', fontSize: '0.78rem' }}
              />
            </div>

            {/* Drag-and-drop zone */}
            <div
              onClick={() => uploadProgress === null && fileInputRef.current?.click()}
              onDragOver={(_err) => { _err.preventDefault(); _err.stopPropagation(); setIsDragging(true); }}
              onDragEnter={(_err) => { _err.preventDefault(); setIsDragging(true); }}
              onDragLeave={(_err) => { _err.preventDefault(); setIsDragging(false); }}
              onDrop={async (_err) => {
                _err.preventDefault(); _err.stopPropagation(); setIsDragging(false);
                const file = _err.dataTransfer.files?.[0];
                await handleApkFile(file);
              }}
              style={{
                border: `2px dashed ${isDragging ? '#6366f1' : uploadProgress !== null ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.35)'}`,
                borderRadius: '14px',
                padding: '1.25rem 1rem',
                textAlign: 'center',
                cursor: uploadProgress !== null ? 'not-allowed' : 'pointer',
                background: isDragging ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.04)',
                transition: 'all 0.18s ease',
                opacity: uploadProgress !== null ? 0.6 : 1,
                userSelect: 'none'
              }}
            >
              {uploadProgress !== null ? (
                <>
                  <div style={{ fontSize: '0.72rem', color: '#a5b4fc', fontWeight: '800', marginBottom: '0.5rem' }}>Nahrávám... {uploadProgress}%</div>
                  <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '10px', height: '6px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'var(--accent-color)', transition: 'width 0.2s', borderRadius: '10px' }} />
                  </div>
                </>
              ) : isDragging ? (
                <>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📦</div>
                  <div style={{ fontSize: '0.78rem', color: '#a5b4fc', fontWeight: '900' }}>Pusť pro nahrání APK</div>
                </>
              ) : (
                <>
                  <Upload size={22} style={{ color: '#a5b4fc', marginBottom: '0.4rem', opacity: 0.7 }} />
                  <div style={{ fontSize: '0.78rem', color: '#a5b4fc', fontWeight: '800', marginBottom: '0.2rem' }}>Přetáhni APK sem</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>nebo klikni pro výběr souboru</div>
                </>
              )}
            </div>

            {apkError && <div style={{ fontSize: '0.72rem', color: 'var(--_err-color)', marginTop: '0.5rem' }}>{apkError}</div>}
            {apkSuccess && <div style={{ fontSize: '0.72rem', color: 'var(--success-color)', marginTop: '0.5rem' }}>✓ APK nahráno úspěšně</div>}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

export default InfraTab;
