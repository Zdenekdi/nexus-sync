import React from 'react';
import { 
  BookOpen, Rocket, Smartphone, Shield, 
  MessageSquare, Users, Zap, CheckCircle2,
  ArrowRight, Info, HelpCircle
} from 'lucide-react';
import { useNexus } from '../../context/ContextHook';

const ManualCard = ({ icon: Icon, title, children, color = 'var(--accent-color)' }) => (
  <div style={{
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '20px',
    padding: '2rem',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  }}>
    <div style={{ 
      width: '50px', height: '50px', borderRadius: '14px', 
      background: `${color}15`, display: 'flex', 
      alignItems: 'center', justifyContent: 'center', color: color 
    }}>
      <Icon size={26} />
    </div>
    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>{title}</h3>
    <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, flex: 1 }}>
      {children}
    </div>
  </div>
);

const StepItem = ({ num, title, desc }) => (
  <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
    <div style={{ 
      width: '32px', height: '32px', borderRadius: '50%', 
      background: 'var(--accent-color)', color: 'white', 
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.9rem', fontWeight: '900', flexShrink: 0,
      boxShadow: '0 0 15px rgba(59, 130, 246, 0.4)'
    }}>
      {num}
    </div>
    <div>
      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '800' }}>{title}</h4>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>{desc}</p>
    </div>
  </div>
);

const ManualView = () => {
  const { lang, t } = useNexus();
  const isCz = lang === 'cz';

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.4s ease-out' }}>
      <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <div style={{ 
          display: 'inline-flex', alignItems: 'center', gap: '0.75rem', 
          padding: '0.5rem 1.25rem', background: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '30px', color: 'var(--accent-color)', marginBottom: '1.5rem'
        }}>
          <BookOpen size={18} />
          <span style={{ fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {isCz ? 'UŽIVATELSKÁ PŘÍRUČKA' : 'USER MANUAL'}
          </span>
        </div>
        <h1 style={{ margin: '0 0 1rem 0', fontSize: '2.5rem', fontWeight: '900' }}>
          {isCz ? 'Jak ovládnout Nexus Hub' : 'Mastering Nexus Hub'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '700px', margin: '0 auto' }}>
          {isCz 
            ? 'Vše, co potřebujete vědět pro efektivní správu vaší agentury od prvního přihlášení až po pokročilou automatizaci.' 
            : 'Everything you need to know for efficient agency management from first login to advanced automation.'}
        </p>
      </header>

      <section style={{ marginBottom: '4rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', borderRadius: '24px', padding: '2.5rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0 0 2rem 0', fontSize: '1.5rem', fontWeight: '900' }}>
              <Rocket size={24} color="#10b981" /> {isCz ? 'Průvodce registrací' : 'Registration Guide'}
            </h2>
            
            <StepItem 
              num="1" 
              title={isCz ? 'Založení Agentury' : 'Create Agency'}
              desc={isCz 
                ? 'Na přihlašovací obrazovce zvolte "Nová agentura". Po registraci získáte unikátní Zvací kód v Dashboardu. Tento kód je klíčem pro váš tým.' 
                : 'Choose "New Agency" on the login screen. After registering, you\'ll find your unique Invite Code in the Dashboard. This code is the key for your team.'}
            />
            
            <StepItem 
              num="2" 
              title={isCz ? 'Pozvání týmu' : 'Invite Your Team'}
              desc={isCz 
                ? 'Vaše operátorky a modelky si vytvoří účet přes záložku "Připojit se" použitím vašeho kódu. Vy je pak v sekci "Hierarchie" schválíte a přiřadíte jim role.' 
                : 'Your operators and models create accounts via the "Join" tab using your code. You then approve them and assign roles in the "Hierarchy" section.'}
            />
            
            <StepItem 
              num="3" 
              title={isCz ? 'Propojení telefonu' : 'Connect Devices'}
              desc={isCz 
                ? 'Pro příjem SMS a hovorů nainstalujte Nexus Relay APK na Android zařízení. V sekci "Relay" pak uvidíte stav připojení v reálném čase.' 
                : 'To receive SMS and calls, install the Nexus Relay APK on an Android device. You can then monitor connection status in the "Relay" section.'}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <ManualCard icon={MessageSquare} title={isCz ? 'Unified Inbox' : 'Unified Inbox'}>
              {isCz 
                ? 'Sjednocená schránka pro všechny vaše kanály. Využívejte AI překladač a v budoucnu i Smart Replies pro bleskové odbavení klientů.' 
                : 'A consolidated inbox for all your channels. Use the AI translator and upcoming Smart Replies for lightning-fast client handling.'}
            </ManualCard>
            
            <ManualCard icon={Shield} title={isCz ? 'Safety Guard' : 'Safety Guard'} color="#ef4444">
              {isCz 
                ? 'Pojistka pro vaše modelky. Hands-free SOS, Audio Sentinel a GPS tracking zajišťují maximální bezpečí během schůzek.' 
                : 'Protection for your models. Hands-free SOS, Audio Sentinel, and GPS tracking ensure maximum safety during bookings.'}
            </ManualCard>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '4rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '2rem', textAlign: 'center' }}>
          {isCz ? 'Časté scénáře' : 'Common Scenarios'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>
              <Smartphone size={20} />
              <h4 style={{ margin: 0, fontWeight: '800' }}>{isCz ? 'Zpoždění schůzky' : 'Booking Delay'}</h4>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {isCz 
                ? 'V kalendáři můžete jedním kliknutím posunout schůzku. Systém automaticky navrhne SMS zprávu pro klienta s omluvou.' 
                : 'In the calendar, you can delay a booking with one click. The system automatically suggests an apology SMS for the client.'}
            </p>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>
              <Zap size={20} />
              <h4 style={{ margin: 0, fontWeight: '800' }}>{isCz ? 'Rychlé poznámky' : 'Quick Notes'}</h4>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {isCz 
                ? 'V CRM si ukládejte preference klientů. Tyto informace uvidí každá operátorka, která s klientem bude příště mluvit.' 
                : 'Store client preferences in the CRM. This info will be visible to every operator who speaks with the client next.'}
            </p>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>
              <Users size={20} />
              <h4 style={{ margin: 0, fontWeight: '800' }}>{isCz ? 'Správa Webů' : 'Web Profiles'}</h4>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {isCz 
                ? 'Změňte Bio nebo fotky v Nexusu a nechte je automaticky synchronizovat na všechny inzertní portály (AW, EGE atd.).' 
                : 'Change Bio or photos in Nexus and have them automatically synced to all advertising portals (AW, EGE etc.).'}
            </p>
          </div>
        </div>
      </section>

      <footer style={{ 
        padding: '3rem', borderRadius: '24px', 
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
        textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)'
      }}>
        <HelpCircle size={40} color="var(--accent-color)" style={{ marginBottom: '1rem' }} />
        <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: '800' }}>{isCz ? 'Potřebujete další pomoc?' : 'Need more help?'}</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          {isCz 
            ? 'Náš tým podpory je vám k dispozici přímo v aplikaci nebo přes oficiální kanál.' 
            : 'Our support team is available directly in the app or via the official channel.'}
        </p>
        <button style={{ 
          padding: '0.85rem 2rem', borderRadius: '12px', border: 'none',
          background: 'var(--accent-color)', color: 'white', fontWeight: '800',
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.75rem'
        }}>
          {isCz ? 'Kontaktovat podporu' : 'Contact Support'} <ArrowRight size={18} />
        </button>
      </footer>
    </div>
  );
};

export default ManualView;
