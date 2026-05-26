import React, { useState, useEffect, memo } from 'react';
import { 
  Lock, Mail, ArrowRight, Eye, EyeOff, 
  Building2, User, Zap, UserPlus, ShieldCheck,
  ChevronRight, Copy, Check
} from 'lucide-react';
import { useNexus } from '../context/ContextHook';
import AuthLayout from './AuthLayout';
import PasswordRequirements from './UI/PasswordRequirements';

// --- Shared Components ---
const InputGroup = ({ label, icon: Icon, children }) => (
  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
    <label style={{ 
      fontSize: '0.85rem', fontWeight: '800', color: 'rgba(255,255,255,0.4)', 
      textTransform: 'uppercase', letterSpacing: '0.12em', marginLeft: '0.5rem' 
    }}>
      {label}
    </label>
    <div style={{ position: 'relative' }}>
      <Icon size={20} style={{ 
        position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', 
        color: 'rgba(255,255,255,0.25)', transition: 'color 0.3s' 
      }} />
      {children}
    </div>
  </div>
);

const StyledInput = (props) => (
  <input 
    {...props}
    style={{
      width: '100%', padding: '1.1rem 1.25rem 1.1rem 3.25rem',
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '18px', color: 'white', fontSize: '1.05rem', outline: 'none',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', backdropFilter: 'blur(10px)',
      ...props.style
    }}
  />
);

const PrimaryButton = ({ children, loading, ...props }) => (
  <button 
    {...props}
    disabled={loading || props.disabled}
    style={{
      width: '100%', padding: '1.25rem',
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      color: 'white', border: 'none', borderRadius: '18px',
      fontSize: '1.1rem', fontWeight: '900', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.85rem',
      marginTop: '1rem', boxShadow: '0 20px 40px -10px rgba(59, 130, 246, 0.5)',
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      opacity: loading ? 0.7 : 1,
      transform: loading ? 'scale(0.98)' : 'scale(1)',
      ...props.style
    }}
  >
    {loading ? '...' : children}
  </button>
);

// --- Sub-Views ---

const LoginView = ({ isCz, onSwitch }) => {
  const { onLogin, showToast } = useNexus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await onLogin(email, password);
      if (res && !res.success) showToast(res.error, 'error');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header>
        <h3 style={{ fontSize: '2rem', fontWeight: '950', color: 'white', margin: 0, letterSpacing: '-0.02em' }}>
          {isCz ? 'Vítejte zpět' : 'Welcome back'}
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', fontWeight: '500' }}>
          {isCz ? 'Přihlaste se ke svému Nexus účtu.' : 'Sign in to your Nexus account.'}
        </p>
      </header>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <InputGroup label={isCz ? 'E-mail' : 'Email'} icon={Mail}>
          <StyledInput data-testid="login-email" type="email" required placeholder="name@agency.com" value={email} onChange={e => setEmail(e.target.value)} />
        </InputGroup>

        <InputGroup label={isCz ? 'Heslo' : 'Password'} icon={Lock}>
          <StyledInput data-testid="login-password" type={showPassword ? 'text' : 'password'} required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          <button 
            type="button" onClick={() => setShowPassword(!showPassword)}
            style={{ position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </InputGroup>

        <PrimaryButton data-testid="login-submit" type="submit" loading={loading}>
          {isCz ? 'Přihlásit se' : 'Sign In'} <ArrowRight size={20} />
        </PrimaryButton>
      </form>

      <div style={{ padding: '1.5rem', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem', margin: '0 0 1rem 0' }}>
          {isCz ? 'Ještě nemáte účet?' : "Don't have an account yet?"}
        </p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => onSwitch('register-agency')}
            style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#3b82f6', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            {isCz ? 'Založit agenturu' : 'Start Agency'}
          </button>
          <button 
            onClick={() => onSwitch('join-agency')}
            style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            {isCz ? 'Připojit se' : 'Join Agency'}
          </button>
        </div>
      </div>
    </div>
  );
};

const RegisterAgencyView = ({ isCz, onSwitch }) => {
  const { onRegisterAgency, showToast } = useNexus();
  const [formData, setFormData] = useState({ agencyName: '', fullName: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) return showToast(isCz ? 'Hesla se neshodují' : 'Passwords do not match', 'error');
    if (formData.password.length < 8) return showToast(isCz ? 'Heslo je příliš krátké' : 'Password too short', 'error');
    
    setLoading(true);
    try {
      const res = await onRegisterAgency({ 
        agencyName: formData.agencyName, 
        fullName: formData.fullName, 
        email: formData.email, 
        password: formData.password 
      });
      if (res?.success) setInviteCode(res.inviteCode);
      else if (res?.error) showToast(res.error, 'error');
    } finally { setLoading(false); }
  };

  if (inviteCode) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', margin: '0 auto' }}>
          <ShieldCheck size={40} />
        </div>
        <header>
          <h3 style={{ fontSize: '2rem', fontWeight: '950', color: 'white', margin: 0 }}>{isCz ? 'Agentura vytvořena!' : 'Agency Created!'}</h3>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>
            {isCz ? 'Zde je váš unikátní zvací kód pro modelky:' : 'Here is your unique invite code for models:'}
          </p>
        </header>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '1.5rem', position: 'relative' }}>
          <code style={{ fontSize: '2rem', fontWeight: '900', color: '#3b82f6', letterSpacing: '0.1em', fontFamily: 'monospace' }}>{inviteCode}</code>
          <button 
            onClick={() => { navigator.clipboard.writeText(inviteCode); showToast(isCz ? 'Zkopírováno!' : 'Copied!', 'success'); }}
            style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(59, 130, 246, 0.1)', border: 'none', padding: '0.75rem', borderRadius: '12px', color: '#3b82f6', cursor: 'pointer' }}
          >
            <Copy size={18} />
          </button>
        </div>
        <PrimaryButton onClick={() => onSwitch('login')}>
          {isCz ? 'Pokračovat k přihlášení' : 'Continue to Login'} <ChevronRight size={20} />
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header>
        <h3 style={{ fontSize: '2rem', fontWeight: '950', color: 'white', margin: 0 }}>{isCz ? 'Nová agentura' : 'Register Agency'}</h3>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>{isCz ? 'Získejte Enterprise infrastrukturu pro vaši firmu.' : 'Get Enterprise infrastructure for your business.'}</p>
      </header>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <InputGroup label={isCz ? 'Název agentury' : 'Agency Name'} icon={Building2}>
          <StyledInput required placeholder={isCz ? 'např. Elite Models' : 'e.g. Elite Models'} value={formData.agencyName} onChange={e => setFormData({...formData, agencyName: e.target.value})} />
        </InputGroup>
        <InputGroup label={isCz ? 'Vaše celé jméno' : 'Your Full Name'} icon={User}>
          <StyledInput required placeholder="John Doe" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
        </InputGroup>
        <InputGroup label={isCz ? 'E-mail' : 'Email'} icon={Mail}>
          <StyledInput type="email" required placeholder="john@agency.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
        </InputGroup>
        <InputGroup label={isCz ? 'Heslo' : 'Password'} icon={Lock}>
          <StyledInput type={showPassword ? 'text' : 'password'} required placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}>
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </InputGroup>
        <PasswordRequirements password={formData.password} isCz={isCz} />
        <InputGroup label={isCz ? 'Potvrďte heslo' : 'Confirm Password'} icon={Lock}>
          <StyledInput type={showPassword ? 'text' : 'password'} required placeholder="••••••••" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
        </InputGroup>

        <PrimaryButton type="submit" loading={loading}>
          {isCz ? 'Vytvořit agenturu' : 'Create Agency'} <ArrowRight size={20} />
        </PrimaryButton>
      </form>

      <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
        {isCz ? 'Už máte účet?' : 'Already have an account?'} {' '}
        <button onClick={() => onSwitch('login')} style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: '800', cursor: 'pointer', padding: 0 }}>
          {isCz ? 'Přihlásit se' : 'Sign In'}
        </button>
      </p>
    </div>
  );
};

const JoinAgencyView = ({ isCz, onSwitch }) => {
  const { onRegisterUser, showToast } = useNexus();
  const [formData, setFormData] = useState({ inviteCode: '', fullName: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) return showToast(isCz ? 'Hesla se neshodují' : 'Passwords do not match', 'error');
    if (formData.password.length < 8) return showToast(isCz ? 'Heslo je příliš krátké' : 'Password too short', 'error');

    setLoading(true);
    try {
      const { confirmPassword: _confirmPassword, ...submitData } = formData;
      const res = await onRegisterUser(submitData);
      if (res?.success) {
        showToast(isCz ? 'Registrace úspěšná!' : 'Registration successful!', 'success');
        onSwitch('login');
      } else if (res?.error) showToast(res.error, 'error');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header>
        <h3 style={{ fontSize: '2rem', fontWeight: '950', color: 'white', margin: 0 }}>{isCz ? 'Připojit se k agentuře' : 'Join an Agency'}</h3>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>{isCz ? 'Zadejte kód, který jste obdrželi od své agentury.' : 'Enter the code you received from your agency.'}</p>
      </header>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <InputGroup label={isCz ? 'Zvací kód' : 'Invite Code'} icon={Zap}>
          <StyledInput required placeholder="NEXUS-..." value={formData.inviteCode} onChange={e => setFormData({...formData, inviteCode: e.target.value})} />
        </InputGroup>
        <InputGroup label={isCz ? 'Vaše celé jméno' : 'Your Full Name'} icon={UserPlus}>
          <StyledInput required placeholder="Jane Doe" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
        </InputGroup>
        <InputGroup label={isCz ? 'E-mail' : 'Email'} icon={Mail}>
          <StyledInput type="email" required placeholder="jane@email.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
        </InputGroup>
        <InputGroup label={isCz ? 'Heslo' : 'Password'} icon={Lock}>
          <StyledInput type={showPassword ? 'text' : 'password'} required placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}>
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </InputGroup>
        <PasswordRequirements password={formData.password} isCz={isCz} />
        <InputGroup label={isCz ? 'Potvrďte heslo' : 'Confirm Password'} icon={Lock}>
          <StyledInput type={showPassword ? 'text' : 'password'} required placeholder="••••••••" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
        </InputGroup>

        <PrimaryButton type="submit" loading={loading}>
          {isCz ? 'Zaregistrovat se' : 'Join Now'} <ArrowRight size={20} />
        </PrimaryButton>
      </form>

      <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
        {isCz ? 'Chcete založit vlastní agenturu?' : 'Want to start your own agency?'} {' '}
        <button onClick={() => onSwitch('register-agency')} style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: '800', cursor: 'pointer', padding: 0 }}>
          {isCz ? 'Registrovat se zde' : 'Register here'}
        </button>
      </p>
    </div>
  );
};

// --- Main Optimized Component ---

const LoginScreen = () => {
  const { lang, authInitialTab, setAuthInitialTab } = useNexus();
  const [view, setView] = useState(authInitialTab || 'login');

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (authInitialTab) setView(authInitialTab);
  }, [authInitialTab]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isCz = lang === 'cz';

  const handleSwitch = (newView) => {
    setView(newView);
    setAuthInitialTab(newView);
    // Optionally update URL
    const path = newView === 'login' ? '/login' : '/register';
    window.history.pushState(null, '', path);
  };

  return (
    <AuthLayout 
      title={
        view === 'login' ? null : 
        (view === 'register-agency' ? (isCz ? 'Enterprise infrastruktura.' : 'Enterprise infrastructure.') : (isCz ? 'Vaše kariéra začíná zde.' : 'Your career starts here.'))
      }
    >
      {view === 'login' && <LoginView isCz={isCz} onSwitch={handleSwitch} />}
      {view === 'register-agency' && <RegisterAgencyView isCz={isCz} onSwitch={handleSwitch} />}
      {view === 'join-agency' && <JoinAgencyView isCz={isCz} onSwitch={handleSwitch} />}
    </AuthLayout>
  );
};

export default memo(LoginScreen);
