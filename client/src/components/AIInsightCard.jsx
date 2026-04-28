import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, ArrowRight, RefreshCw, AlertCircle, Quote } from 'lucide-react';
import { useAI } from '../hooks/useAI';
import { useNexus } from '../context/ContextHook';

/**
 * AI Insight Card - Displays smart analysis from Llama 3.1
 */
const AIInsightCard = ({ stats, agencies, systemHealth }) => {
  const { lang, t, setActiveTab, activeRole } = useNexus();
  const { askAi, isAiLoading, aiError } = useAI();
  const [insight, setInsight] = useState(null);

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

  useEffect(() => {
    if (stats && !insight && !isAiLoading) {
      generateInsight();
    }
  }, [stats]);

  const isCz = lang === 'cz' || lang === 'cs';

  return (
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
              onClick={() => setActiveTab('analytics')}
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
  );
};

export default AIInsightCard;
