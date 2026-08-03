import React, { useState, useEffect, memo } from 'react';
import { 
  Lock, Mail, ArrowRight, Eye, EyeOff, 
  Building2, User, Zap, UserPlus, ShieldCheck,
  ChevronRight, Copy, Check, AlertCircle, Send
} from 'lucide-react';
import { useNexus } from '../context/ContextHook';
import AuthLayout from './AuthLayout';
import PasswordRequirements from './UI/PasswordRequirements';

// --- Shared Components ---
// `htmlFor` + `id` na poli: popisek byl dosud jen text nad inputem, takže
// odečítač obrazovky ohlásil pole bez názvu a kliknutí na popisek nic nedělalo.
// `action` je volitelný doplněk vpravo v řádku popisku (např. reset hesla).
const InputGroup = ({ label, icon: Icon, htmlFor, action, children }) => (
  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginLeft: '0.5rem' }}>
      <label htmlFor={htmlFor} style={{ 
        fontSize: '0.85rem', fontWeight: '800', color: 'rgba(255,255,255,0.4)', 
        textTransform: 'uppercase', letterSpacing: '0.12em'
      }}>
        {label}
      </label>
      {action}
    </div>
    <div style={{ position: 'relative' }}>
      <Icon size={20} style={{ 
        position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', 
        color: 'rgba(255,255,255,0.25)', transition: 'color 0.3s',
        zIndex: 10, pointerEvents: 'none'
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
      background: '#11141c', border: '1px solid #242a36',
      borderRadius: '12px', color: 'white', fontSize: '1.05rem', outline: 'none',
      minHeight: '50px',
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
      color: 'white', border: 'none', borderRadius: '12px',
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

// Server vrací hotové anglické věty ('Invalid credentials'), ne překladové klíče,
// takže t() je vrátí beze změny a česká verze ukazovala anglicky. Dokud to viselo
// v mizícím toastu, nikdo si toho nevšiml; jako trvalá hláška u formuláře už to
// vadí. Neznámou chybu radši zobecníme, než abychom uživateli ukázali hlášku
// z backendu.
const loginErrorMessage = (raw, isCz) => {
  const known = {
    'Invalid credentials': ['Nesprávný e-mail nebo heslo.', 'Incorrect email or password.'],
    'User role is not configured': ['Účet nemá přiřazenou roli. Ozvěte se správci agentury.', 'This account has no role assigned. Contact your agency admin.'],
    'Server error': ['Server právě neodpovídá. Zkuste to prosím za chvíli.', 'The server is not responding. Please try again shortly.']
  }[raw];
  if (known) return isCz ? known[0] : known[1];
  return isCz ? 'Přihlášení se nepodařilo. Zkuste to prosím znovu.' : 'Sign-in failed. Please try again.';
};

const LoginView = ({ isCz, onSwitch }) => {
  const { onLogin, onResetRequest, showToast } = useNexus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // Chyba přihlášení mířila jen do toastu, který za pár vteřin zmizí. Kdo si ho
  // nestihl přečíst, zůstal u formuláře bez vysvětlení, proč se nic nestalo.
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await onLogin(email, password);
      if (res && !res.success) {
        const message = loginErrorMessage(res.error || res._err, isCz);
        setError(message);
        showToast(message, 'error');
      }
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      const message = isCz ? 'Nejdřív vyplňte e-mail, pošleme na něj odkaz.' : 'Enter your email first — we will send the link there.';
      setError(message);
      return;
    }
    await onResetRequest(email);
    // Server záměrně neprozrazuje, jestli e-mail existuje, tak to neprozrazujeme ani my.
    showToast(isCz ? 'Pokud u nás účet existuje, poslali jsme na něj odkaz.' : 'If an account exists, we have sent a link to it.', 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/nexus_icon.png" style={{ width: '32px', height: '32px', borderRadius: '6px' }} alt="Nexus Hub" onError={e => { e.target.style.display = 'none'; }} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#60a5fa', margin: 0, letterSpacing: '0.05em' }}>
            NEXUS HUB
          </h2>
        </div>
        <h3 style={{ fontSize: '2rem', fontWeight: '950', color: 'white', margin: 0, letterSpacing: '-0.02em' }}>
          {isCz ? 'Vítejte zpět' : 'Welcome back'}
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', fontWeight: '500' }}>
          {isCz ? 'Přihlaste se ke svému Nexus účtu.' : 'Sign in to your Nexus account.'}
        </p>
      </header>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <InputGroup label={isCz ? 'E-mail' : 'Email'} icon={Mail} htmlFor="login-email-field">
          <StyledInput id="login-email-field" data-testid="login-email" type="email" required autoComplete="email" placeholder="name@agency.com" value={email} onChange={e => setEmail(e.target.value)} />
        </InputGroup>

        <InputGroup
          label={isCz ? 'Heslo' : 'Password'}
          icon={Lock}
          htmlFor="login-password-field"
          action={
            <button type="button" onClick={handleForgotPassword} style={{ background: 'none', border: 'none', padding: 0, color: '#60a5fa', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}>
              {isCz ? 'Zapomenuté heslo?' : 'Forgot password?'}
            </button>
          }
        >
          <StyledInput id="login-password-field" data-testid="login-password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          <button 
            type="button" onClick={() => setShowPassword(!showPassword)}
            style={{ position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </InputGroup>

        {error && (
          <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem', padding: '0.9rem 1.1rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <AlertCircle size={18} color="#f87171" style={{ flex: 'none', marginTop: '1px' }} />
            <span style={{ fontSize: '0.9rem', color: '#fca5a5', lineHeight: 1.5 }}>{error}</span>
          </div>
        )}

        <PrimaryButton data-testid="login-submit" type="submit" loading={loading}>
          {isCz ? 'Přihlásit se' : 'Sign In'} <ArrowRight size={20} />
        </PrimaryButton>
      </form>

      <div style={{ padding: '1.5rem', borderRadius: '12px', background: '#11141c', border: '1px solid #242a36', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem', margin: '0 0 1rem 0' }}>
          {isCz ? 'Ještě nemáte účet?' : "Don't have an account yet?"}
        </p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => onSwitch('register-agency')}
            style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#3b82f6', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            {isCz ? 'Založit agenturu' : 'Start Agency'}
          </button>
          <button 
            onClick={() => onSwitch('join-agency')}
            style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', background: '#181c26', border: '1px solid #242a36', color: 'white', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            {isCz ? 'Připojit se' : 'Join Agency'}
          </button>
        </div>
      </div>
    </div>
  );
};

const RegisterAgencyView = ({ isCz, onSwitch }) => {
  const { onRegisterAgency, showToast, t } = useNexus();
  const [formData, setFormData] = useState({ agencyName: '', fullName: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState(null);
  const [error, setError] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);

  const fail = (message) => { setError(message); showToast(message, 'error'); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    // Potvrzení hesla schválně zůstává. Je to jediná pojistka proti překlepu
    // v hesle k účtu, který vlastní celou agenturu.
    if (formData.password !== formData.confirmPassword) return fail(isCz ? 'Hesla se neshodují.' : 'Passwords do not match.');
    if (formData.password.length < 8) return fail(isCz ? 'Heslo musí mít aspoň 8 znaků.' : 'Password must be at least 8 characters.');

    setLoading(true);
    try {
      const res = await onRegisterAgency({ 
        agencyName: formData.agencyName, 
        fullName: formData.fullName, 
        email: formData.email, 
        password: formData.password 
      });
      if (res?.success) setInviteCode(res.inviteCode);
      else if (res?.error || res?._err) fail(t(res.error || res._err));
    } finally { setLoading(false); }
  };

  // QR se generuje až tady, po úspěšné registraci — knihovna se stahuje dynamicky,
  // ať neroste balík, který se načítá při prvním otevření webu. Když se nenačte,
  // zůstane čitelný kód i tlačítka; QR je nadstavba, ne jediná cesta.
  useEffect(() => {
    if (!inviteCode) return;
    let cancelled = false;
    import('qrcode')
      .then(QR => QR.toDataURL(inviteCode, { width: 220, margin: 1, color: { dark: '#0b1220', light: '#ffffff' } }))
      .then(url => { if (!cancelled) setQrDataUrl(url); })
      .catch(() => { /* bez QR se dá kód pořád opsat i zkopírovat */ });
    return () => { cancelled = true; };
  }, [inviteCode]);

  const shareInvite = async () => {
    const text = isCz
      ? `Zvací kód do Nexus Hub: ${inviteCode}`
      : `Your Nexus Hub invite code: ${inviteCode}`;
    // Návrh měl „Poslat SMS". To by znamenalo nový endpoint a plochu na zneužití
    // (SMS pumping). Systémové sdílení nabídne SMS, WhatsApp i cokoli dalšího,
    // co má uživatel v telefonu, a nás to nestojí nic.
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch { /* uživatel sdílení zavřel */ }
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast(isCz ? 'Zkopírováno i s textem pozvánky.' : 'Copied with the invite text.', 'success');
    } catch {
      showToast(isCz ? 'Nepodařilo se zkopírovat, opište kód ručně.' : 'Copy failed — please type the code manually.', 'error');
    }
  };

  if (inviteCode) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', margin: '0 auto' }}>
          <ShieldCheck size={40} />
        </div>
        <header>
          <h3 style={{ fontSize: '2rem', fontWeight: '950', color: 'white', margin: 0 }}>{isCz ? 'Agentura vytvořena!' : 'Agency Created!'}</h3>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>
            {isCz
              ? 'Tímto kódem pozvete členy týmu. Účet si založí sami, heslo si nastaví až potom.'
              : 'Use this code to invite your team. They create their own account and set a password afterwards.'}
          </p>
        </header>
        <div style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.35)', borderRadius: '12px', padding: '1.5rem' }}>
          <code className="pub-mono" style={{ display: 'block', fontSize: '1.9rem', fontWeight: '900', color: '#60a5fa', letterSpacing: '0.16em', fontFamily: 'monospace', marginBottom: '1rem', wordBreak: 'break-all' }}>{inviteCode}</code>

          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt={isCz ? 'QR kód se zvacím kódem' : 'QR code containing the invite code'}
              style={{ width: '150px', height: '150px', borderRadius: '10px', display: 'block', margin: '0 auto 1rem' }}
            />
          )}

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              onClick={() => { navigator.clipboard.writeText(inviteCode); showToast(isCz ? 'Zkopírováno!' : 'Copied!', 'success'); }}
              style={{ flex: 1, padding: '0.7rem', borderRadius: '10px', background: '#3b82f6', border: 'none', color: 'white', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Copy size={15} /> {isCz ? 'Zkopírovat' : 'Copy'}
            </button>
            <button
              onClick={shareInvite}
              style={{ flex: 1, padding: '0.7rem', borderRadius: '10px', background: '#181c26', border: '1px solid #2d3444', color: 'white', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Send size={15} /> {isCz ? 'Sdílet pozvánku' : 'Share invite'}
            </button>
          </div>
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
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>{isCz ? 'Čísla a lidi doplníte potom. Teď stačí pár údajů — platební kartu nechceme.' : 'Numbers and people come later. A few details is all we need — no card required.'}</p>
      </header>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <InputGroup label={isCz ? 'Název agentury' : 'Agency Name'} icon={Building2} htmlFor="reg-agency-name">
          <StyledInput id="reg-agency-name" required placeholder={isCz ? 'např. Elite Models' : 'e.g. Elite Models'} value={formData.agencyName} onChange={e => setFormData({...formData, agencyName: e.target.value})} />
        </InputGroup>
        <InputGroup label={isCz ? 'Vaše celé jméno' : 'Your Full Name'} icon={User} htmlFor="reg-full-name">
          <StyledInput id="reg-full-name" autoComplete="name" required placeholder="John Doe" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
        </InputGroup>
        <InputGroup label={isCz ? 'E-mail' : 'Email'} icon={Mail} htmlFor="reg-email">
          <StyledInput id="reg-email" type="email" autoComplete="email" required placeholder="john@agency.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
        </InputGroup>
        <InputGroup label={isCz ? 'Heslo' : 'Password'} icon={Lock} htmlFor="reg-password">
          <StyledInput id="reg-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}>
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </InputGroup>
        <PasswordRequirements password={formData.password} isCz={isCz} />
        <InputGroup label={isCz ? 'Potvrďte heslo' : 'Confirm Password'} icon={Lock} htmlFor="reg-password-confirm">
          <StyledInput id="reg-password-confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required placeholder="••••••••" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
        </InputGroup>

        {error && (
          <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem', padding: '0.9rem 1.1rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <AlertCircle size={18} color="#f87171" style={{ flex: 'none', marginTop: '1px' }} />
            <span style={{ fontSize: '0.9rem', color: '#fca5a5', lineHeight: 1.5 }}>{error}</span>
          </div>
        )}

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
  const { onRegisterUser, showToast, t } = useNexus();
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
      } else if (res?.error || res?._err) showToast(t(res.error || res._err), 'error');
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
    <AuthLayout>
      {view === 'login' && <LoginView isCz={isCz} onSwitch={handleSwitch} />}
      {view === 'register-agency' && <RegisterAgencyView isCz={isCz} onSwitch={handleSwitch} />}
      {view === 'join-agency' && <JoinAgencyView isCz={isCz} onSwitch={handleSwitch} />}
    </AuthLayout>
  );
};

export default memo(LoginScreen);
