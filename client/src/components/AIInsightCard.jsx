import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, ArrowRight, RefreshCw, AlertCircle, Quote } from 'lucide-react';
import { useAI } from '../hooks/useAI';
import { useNexus } from '../context/ContextHook';

/**
 * AI Insight Card - Displays smart analysis from Llama 3.1
 */
const AIInsightCard = ({ stats, agencies, systemHealth }) => {
  const { lang, t, setActiveTab, activeRole, isMobile } = useNexus();
  const { askAi, isAiLoading, aiError } = useAI();
  const [insight, setInsight] = useState(null);
  const [showDetailedAudit, setShowDetailedAudit] = useState(false);
  const [detailedReport, setDetailedReport] = useState(null);
  const [isReportLoading, setIsReportLoading] = useState(false);

  const generateInsight = async () => {
    const isCz = lang === 'cz' || lang === 'cs';
    const isAppOwner = activeRole === 'App Owner';
    
    let context = "";
    let systemPrompt = "";
    let userPrompt = "";

    if (isAppOwner && systemHealth) {
      // Technical Perspective for App Owner
      context = `
        Technický stav platformy:
        - CPU Load: ${systemHealth.cpu.loadAvg[0]}
        - Memory: ${systemHealth.memory.percent}% (${systemHealth.memory.used} / ${systemHealth.memory.total})
        - Disk: ${systemHealth.disk.percent} (${systemHealth.disk.used})
        - Uptime: ${systemHealth.uptime.days}d ${systemHealth.uptime.hours}h
        - Aktivita: ${stats?.totalMessages || 0} zpráv dnes, ${stats?.totalAgencies || 0} aktivních agentur.
      `;

      systemPrompt = isCz
        ? "Jsi Nexus AI, technologický ředitel (CTO) a systémový architekt. Tvým úkolem je monitorovat zdraví platformy a upozorňovat na technické anomálie nebo úzká hrdla. Buď velmi stručný, technický a věcný. Používej odrážky."
        : "You are Nexus AI, a CTO and System Architect. Your job is to monitor platform health and flag technical anomalies or bottlenecks. Be very concise, technical, and factual. Use bullet points.";

      userPrompt = isCz
        ? `Analyzuj tento stav infrastruktury a napiš 3 krátké technické postřehy o stabilitě a výkonu systému. Zde jsou data: ${context}`
        : `Analyze this infrastructure state and write 3 short technical insights about system stability and performance. Here is the data: ${context}`;
    } else {
      // Business Perspective for Managers/Operators
      context = `
        Data pro analytiku:
        - Obrat: ${stats?.revenue || '0'}
        - Aktivita zpráv: ${stats?.totalMessages || 0}
        - Počet spravovaných účtů: ${stats?.totalProfiles || 0}
        - Růst: ${stats?.commissionGrowth || 'STABLE'}
      `;

      systemPrompt = isCz 
        ? "Jsi Nexus AI, elitní business analytik pro digitální mediální agentury. Zaměřuješ se VÝHRADNĚ na ekonomický růst, efektivitu a statistiky. Tvé odpovědi jsou stručné, profesionální a motivační. Používej odrážky. Pokud jsou data nízká, buď povzbudivý."
        : "You are Nexus AI, an elite business analyst for digital media agencies. You focus EXCLUSIVELY on economic growth, efficiency, and statistics. Your answers are concise, professional, and motivational. Use bullet points. If data is low, be encouraging.";

      userPrompt = isCz
        ? `Analyzuj tato ekonomická data a napiš 3 krátké body (každý max 10 slov), co je dnes klíčové pro růst firmy. Zde jsou data: ${context}`
        : `Analyze these economic metrics and write 3 short bullet points (max 10 words each) on what is key for business growth today. Here is the data: ${context}`;
    }

    const response = await askAi(userPrompt, systemPrompt);
    if (response) {
      setInsight(response);
    }
  };

  const handleDetailedAction = async () => {
    if (activeRole === 'App Owner') {
      setShowDetailedAudit(true);
      if (!detailedReport && !isReportLoading) {
        setIsReportLoading(true);
        const isCz = lang === 'cz' || lang === 'cs';
        const context = `
          Full Infrastructure State:
          - CPU: Load Avg ${systemHealth.cpu.loadAvg.join(', ')}
          - RAM: ${systemHealth.memory.percent}% used (${systemHealth.memory.used} of ${systemHealth.memory.total})
          - Disk: ${systemHealth.disk.percent} (${systemHealth.disk.used} of ${systemHealth.disk.total})
          - SWAP: ${systemHealth.memory.swapUsed} / ${systemHealth.memory.swapTotal}
          - OS: ${systemHealth.os.platform} ${systemHealth.os.release}
          - Node Version: ${systemHealth.os.nodeVersion}
          - Total Agencies: ${stats?.totalAgencies || 0}
          - Total Active Messages: ${stats?.totalMessages || 0}
        `;
        
        const systemPrompt = isCz
          ? "Jsi Nexus Core AI, hloubkový systémový auditor. Tvým úkolem je vypracovat detailní technický report o stavu platformy. Zaměř se na využití prostředků, predikci stability a doporučení pro údržbu. Používej profesionální, technický tón."
          : "You are Nexus Core AI, a deep system auditor. Your task is to generate a detailed technical report about the platform's health. Focus on resource utilization, stability prediction, and maintenance recommendations. Use a professional, technical tone.";
        
        const userPrompt = isCz
          ? `Vypracuj hloubkový technický audit na základě těchto dat: ${context}. Report by měl mít cca 150 slov.`
          : `Generate a deep-dive technical audit based on this data: ${context}. The report should be around 150 words.`;

        const resp = await askAi(userPrompt, systemPrompt);
        setDetailedReport(resp);
        setIsReportLoading(false);
      }
    } else {
      setActiveTab('analytics');
    }
  };

  useEffect(() => {
    if (stats && !insight && !isAiLoading) {
      generateInsight();
    }
  }, [stats]);

  const isCz = lang === 'cz' || lang === 'cs';

  return (
    <>
      <div className="glass-card fade-in" style={{ 
        padding: '2rem', 
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Decor */}
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1 }}>
          <Brain size={120} color="var(--accent-color)" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '12px', 
              background: 'var(--accent-color)', display: 'flex', 
              alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
            }}>
              <Sparkles size={20} color="white" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '900', letterSpacing: '0.02em' }}>NEXUS AI INSIGHT</h3>
              <div style={{ fontSize: '0.65rem', color: 'var(--accent-color)', fontWeight: '800', letterSpacing: '0.1em' }}>POWERED BY LLAMA 3.1</div>
            </div>
          </div>
          
          <button 
            onClick={generateInsight}
            disabled={isAiLoading}
            style={{ 
              background: 'rgba(255,255,255,0.05)', border: 'none', 
              color: 'var(--text-secondary)', cursor: 'pointer',
              padding: '0.5rem', borderRadius: '10px',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={16} className={isAiLoading ? 'spin-animation' : ''} />
          </button>
        </div>

        <div style={{ minHeight: '80px' }}>
          {isAiLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="skeleton-text" style={{ width: '90%', height: '14px', borderRadius: '4px' }}></div>
              <div className="skeleton-text" style={{ width: '70%', height: '14px', borderRadius: '4px' }}></div>
              <div className="skeleton-text" style={{ width: '85%', height: '14px', borderRadius: '4px' }}></div>
            </div>
          ) : aiError ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--_err-color)', fontSize: '0.85rem', fontWeight: '600' }}>
              <AlertCircle size={18} /> {aiError}
            </div>
          ) : insight ? (
            <div style={{ position: 'relative' }}>
              <div style={{ 
                fontSize: '0.95rem', color: 'white', lineHeight: '1.6', 
                fontWeight: '600', whiteSpace: 'pre-line' 
              }}>
                {insight}
              </div>
              <div 
                onClick={handleDetailedAction}
                style={{ 
                  marginTop: '1.5rem', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  fontSize: '0.75rem', 
                  color: 'var(--accent-color)', 
                  fontWeight: '800',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                {isCz ? 'ZOBRAZIT DETAILNÍ ANALÝZU' : 'VIEW DETAILED ANALYSIS'} <ArrowRight size={14} />
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>
              {isCz ? 'Čekám na data pro analýzu...' : 'Waiting for data to analyze...'}
            </div>
          )}
        </div>

        {/* Decorative gradient blur */}
        <div style={{ 
          position: 'absolute', bottom: '-30px', left: '-30px', 
          width: '100px', height: '100px', 
          background: 'var(--accent-color)', filter: 'blur(60px)', opacity: 0.2 
        }}></div>
      </div>

      {/* Technical Audit Modal for App Owner */}
      {showDetailedAudit && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', 
          padding: isMobile ? '1rem' : '2rem', backdropFilter: 'blur(10px)', background: 'rgba(0,0,0,0.8)' 
        }}>
          <div className="glass-card fade-in" style={{ 
            maxWidth: '900px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
            background: '#0a0c10', border: '1px solid var(--card-border)', padding: '2.5rem',
            position: 'relative', display: 'flex', flexDirection: 'column', gap: '2rem'
          }}>
            <button 
              onClick={() => setShowDetailedAudit(false)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <ArrowRight size={24} style={{ transform: 'rotate(-45deg)' }} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--accent-color)' }}>
                <Activity size={24} color="var(--accent-color)" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '900' }}>{isCz ? 'Technický Audit Systému' : 'System Technical Audit'}</h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700' }}>{isCz ? 'ZALOŽENO NA REÁLNÉ TELEMETRII' : 'BASED ON REAL-TIME TELEMETRY'}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '1rem' }}>
              {[
                { label: 'CPU LOAD', value: systemHealth?.cpu?.loadAvg[0], icon: <Activity size={16} /> },
                { label: 'MEMORY', value: `${systemHealth?.memory?.percent}%`, icon: <Brain size={16} /> },
                { label: 'DISK', value: systemHealth?.disk?.percent, icon: <HardDrive size={16} /> },
                { label: 'UPTIME', value: `${systemHealth?.uptime?.days}d`, icon: <RefreshCw size={16} /> }
              ].map((m, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>{m.icon} {m.label}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--accent-color)' }}>{m.value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'rgba(99, 102, 241, 0.05)', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: '900', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--accent-color)' }}>
                <Brain size={18} /> {isCz ? 'AI ANALÝZA A DOPORUČENÍ' : 'AI ANALYSIS & RECOMMENDATIONS'}
              </h4>
              <div style={{ fontSize: '1rem', lineHeight: '1.7', color: '#e2e8f0', fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
                {isReportLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="skeleton-text" style={{ width: '100%', height: '14px' }}></div>
                    <div className="skeleton-text" style={{ width: '90%', height: '14px' }}></div>
                    <div className="skeleton-text" style={{ width: '95%', height: '14px' }}></div>
                  </div>
                ) : (
                  detailedReport
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowDetailedAudit(false)}
                style={{ padding: '0.75rem 2rem', borderRadius: '12px', background: 'var(--accent-color)', color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer' }}
              >
                {isCz ? 'ROZUMÍM' : 'ACKNOWLEDGED'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
  );
};

export default AIInsightCard;
