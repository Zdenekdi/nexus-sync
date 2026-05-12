import React, { useState, useEffect, memo } from 'react';
import { 
  Shield, Lock, Mail, ArrowRight, Eye, EyeOff, 
  ChevronLeft, Building2, UserPlus, Zap, CheckCircle2,
  Globe, BarChart3, Database
} from 'lucide-react';
import { useNexus } from '../context/ContextHook';

// --- Static Styles ---
const STYLES = {
  page: { 
    minHeight: '100dvh', 
    width: '100vw', 
    background: '#040507', 
    display: 'flex', 
    flexDirection: 'row', 
    overflow: 'hidden',
    fontFamily: 'Inter, sans-serif'
  },
  leftSide: {
    flex: 1.2,
    background: 'linear-gradient(135deg, #080a0f 0%, #111827 100%)',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '4rem',
    borderRight: '1px solid rgba(255,255,255,0.05)',
    overflow: 'hidden'
  },
  rightSide: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem',
    background: '#040507',
    position: 'relative',
    zIndex: 10
  },
  glow: {
    position: 'absolute',
    width: '600px',
    height: '600px',
    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15), transparent 70%)',
    filter: 'blur(80px)',
    pointerEvents: 'none',
    zIndex: 0
  },
  formContainer: {
    width: '100%',
    maxWidth: '460px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    animation: 'fadeInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
  },
  inputGroup: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  input: {
    width: '100%',
    padding: '1rem 1rem 1rem 3rem',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    color: 'white',
    fontSize: '1rem',
    outline: 'none',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    backdropFilter: 'blur(10px)'
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginLeft: '0.5rem'
  },
  icon: {
    position: 'absolute',
    left: '1.1rem',
    top: '2.5rem',
    color: 'rgba(255,255,255,0.3)',
    transition: 'color 0.3s'
  },
  submitBtn: {
    width: '100%',
    padding: '1.1rem',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '16px',
    fontSize: '1.1rem',
    fontWeight: '900',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    marginTop: '1rem',
    boxShadow: '0 20px 40px -10px rgba(59, 130, 246, 0.5)',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '2rem',
    color: 'rgba(255,255,255,0.6)',
    animation: 'fadeInLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1) both'
  }
};

const FeatureItem = ({ icon: Icon, title, desc, delay }) => (
  <div style={{ ...STYLES.featureItem, animationDelay: `${delay}s` }}>
    <div style={{ 
      width: '48px', height: '48px', borderRadius: '14px', 
      background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6'
    }}>
      <Icon size={24} />
    </div>
    <div>
      <div style={{ color: 'white', fontWeight: '800', fontSize: '1rem' }}>{title}</div>
      <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>{desc}</div>
    </div>
  </div>
);

const LoginScreen = () => {
  const { lang, onLogin, onRegisterAgency, onRegisterUser, authInitialTab, isMobile, setShowLanding } = useNexus();
  const [activeTab, setActiveTab] = useState(authInitialTab || 'login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', agencyName: '', inviteCode: '', name: '' });

  const isCz = lang === 'cz';

  useEffect(() => {
    if (authInitialTab) setActiveTab(authInitialTab);
  }, [authInitialTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (activeTab === 'login') await onLogin(formData.email, formData.password);
      else if (activeTab === 'register-agency') await onRegisterAgency(formData.agencyName, formData.email, formData.password);
      else if (activeTab === 'join-agency') await onRegisterUser(formData.inviteCode, formData.email, formData.password, formData.name);
    } catch (err) {
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const labels = {
    login: isCz ? 'Přihlášení' : 'Login',
    'register-agency': isCz ? 'Nová agentura' : 'New Agency',
    'join-agency': isCz ? 'Připojit se' : 'Join'
  };

  if (isMobile) {
    return (
      <div style={{ ...STYLES.page, flexDirection: 'column', overflow: 'auto', background: '#040507' }}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <img src="/nexus_icon.png" alt="Nexus" style={{ width: '48px', borderRadius: '12px', marginBottom: '1rem' }} />
          <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '950', margin: 0 }}>Nexus Hub</h1>
        </div>
        <div style={{ padding: '0 1.5rem 4rem', width: '100%' }}>
          {renderForm()}
        </div>
      </div>
    );
  }

  function renderForm() {
    return (
      <div style={STYLES.formContainer}>
        <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
          {Object.entries(labels).map(([key, label]) => (
            <button 
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                flex: 1, padding: '0.8rem 0.5rem', border: 'none', borderRadius: '16px',
                background: activeTab === key ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: activeTab === key ? 'white' : 'rgba(255,255,255,0.4)',
                fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {activeTab === 'register-agency' && (
            <div style={STYLES.inputGroup}>
              <label style={STYLES.label}>{isCz ? 'Název agentury' : 'Agency Name'}</label>
              <Building2 style={STYLES.icon} size={20} />
              <input 
                required 
                style={STYLES.input} 
                placeholder={isCz ? 'Např. Elite Models' : 'e.g. Elite Models'}
                value={formData.agencyName}
                onChange={e => setFormData({ ...formData, agencyName: e.target.value })}
              />
            </div>
          )}

          {activeTab === 'join-agency' && (
            <>
              <div style={STYLES.inputGroup}>
                <label style={STYLES.label}>{isCz ? 'Zvací kód' : 'Invite Code'}</label>
                <Zap style={STYLES.icon} size={20} />
                <input 
                  required 
                  style={STYLES.input} 
                  placeholder="EX-123-ABC"
                  value={formData.inviteCode}
                  onChange={e => setFormData({ ...formData, inviteCode: e.target.value })}
                />
              </div>
              <div style={STYLES.inputGroup}>
                <label style={STYLES.label}>{isCz ? 'Vaše jméno' : 'Your Name'}</label>
                <UserPlus style={STYLES.icon} size={20} />
                <input 
                  required 
                  style={STYLES.input} 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </>
          )}

          <div style={STYLES.inputGroup}>
            <label style={STYLES.label}>{isCz ? 'E-mail' : 'Email'}</label>
            <Mail style={STYLES.icon} size={20} />
            <input 
              required 
              type="email"
              style={STYLES.input} 
              placeholder="name@agency.com"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div style={STYLES.inputGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={STYLES.label}>{isCz ? 'Heslo' : 'Password'}</label>
              {activeTab === 'login' && (
                <button type="button" style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>
                  {isCz ? 'Zapomenuté heslo?' : 'Forgot password?'}
                </button>
              )}
            </div>
            <Lock style={STYLES.icon} size={20} />
            <input 
              required 
              type={showPassword ? 'text' : 'password'}
              style={STYLES.input} 
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '1.25rem', top: '2.5rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button disabled={loading} style={{ 
            ...STYLES.submitBtn, 
            opacity: loading ? 0.7 : 1, 
            transform: loading ? 'scale(0.98)' : 'scale(1)' 
          }}>
            {loading ? (isCz ? 'Pracuji...' : 'Processing...') : (
              <>
                {activeTab === 'login' ? (isCz ? 'Přihlásit se' : 'Sign In') : (isCz ? 'Vytvořit účet' : 'Create Account')}
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button 
            onClick={() => setShowLanding(true)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
          >
            <ChevronLeft size={16} /> {isCz ? 'Zpět na úvod' : 'Back to home'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={STYLES.page}>
      <style>{`
        @keyframes fadeInLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
        input:focus { border-color: #3b82f6 !important; background: rgba(59, 130, 246, 0.05) !important; }
      `}</style>

      <div style={STYLES.leftSide}>
        <div style={{ ...STYLES.glow, top: '-10%', left: '-10%' }} />
        
        <div style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem' }}>
            <img src="/nexus_icon.png" alt="Nexus" style={{ width: '56px', borderRadius: '16px', boxShadow: '0 0 30px rgba(59, 130, 246, 0.5)' }} />
            <span style={{ fontSize: '1.75rem', fontWeight: '950', color: 'white', letterSpacing: '0.1em' }}>NEXUS HUB</span>
          </div>

          <h2 style={{ fontSize: '3.5rem', fontWeight: '950', color: 'white', lineHeight: 1.1, marginBottom: '2rem', letterSpacing: '-0.04em' }}>
            {isCz ? 'Absolutní kontrola nad vaší agenturou.' : 'Absolute control over your agency.'}
          </h2>

          <div style={{ marginTop: '4rem' }}>
            <FeatureItem 
              icon={Shield} 
              title={isCz ? 'Safety Guard™' : 'Safety Guard™'} 
              desc={isCz ? 'Real-time monitoring a SOS alerty.' : 'Real-time monitoring and SOS alerts.'} 
              delay={0.1}
            />
            <FeatureItem 
              icon={BarChart3} 
              title={isCz ? 'Deep Analytics' : 'Deep Analytics'} 
              desc={isCz ? 'Detailní přehledy tržeb a výkonu.' : 'Detailed revenue and performance insights.'} 
              delay={0.2}
            />
            <FeatureItem 
              icon={Globe} 
              title={isCz ? 'Omnichannel Sync' : 'Omnichannel Sync'} 
              desc={isCz ? 'WhatsApp, Telegram a OF na jednom místě.' : 'WhatsApp, Telegram and OF in one place.'} 
              delay={0.3}
            />
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: '4rem', color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>
          © {new Date().getFullYear()} Nexus Systems. All rights reserved.
        </div>
      </div>

      <div style={STYLES.rightSide}>
        <div style={{ ...STYLES.glow, bottom: '-10%', right: '-10%', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1), transparent 70%)' }} />
        {renderForm()}
      </div>
    </div>
  );
};

export default LoginScreen;
