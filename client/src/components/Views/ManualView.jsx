import React from 'react';
import { 
  BookOpen, Rocket, Smartphone, Users,
  ArrowRight, CheckCircle2
} from 'lucide-react';
import { useNexus } from '../../context/ContextHook';

const StepItem = ({ num, title, desc }) => (
  <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem' }}>
    <div style={{ 
      width: '40px', height: '40px', borderRadius: '50%', 
      background: 'var(--accent-color)', color: 'white', 
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '1rem', fontWeight: '900', flexShrink: 0,
      boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)'
    }}>
      {num}
    </div>
    <div>
      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: '800' }}>{title}</h4>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>{desc}</p>
    </div>
  </div>
);

const ManualView = () => {
  const { lang, navigate } = useNexus();
  const isCz = lang === 'cz';

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
      <header style={{ marginBottom: '4rem', textAlign: 'center' }}>
        <div style={{ 
          display: 'inline-flex', alignItems: 'center', gap: '0.75rem', 
          padding: '0.5rem 1.25rem', background: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '30px', color: 'var(--accent-color)', marginBottom: '1.5rem'
        }}>
          <Rocket size={18} />
          <span style={{ fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {isCz ? 'RYCHLÝ START' : 'QUICK START'}
          </span>
        </div>
        <h1 style={{ margin: '0 0 1rem 0', fontSize: '3rem', fontWeight: '900', letterSpacing: '-0.02em' }}>
          {isCz ? 'Jak začít s Nexus Hub' : 'Getting Started'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.6 }}>
          {isCz 
            ? 'Průvodce registrací a prvním nastavením vaší agentury. Celý proces nezabere více než 5 minut.' 
            : 'A guide to registering and setting up your agency. The whole process takes less than 5 minutes.'}
        </p>
      </header>

      <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', borderRadius: '32px', padding: '3rem', marginBottom: '3rem' }}>
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

        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <button 
            onClick={() => navigate('/login')}
            style={{ 
              padding: '1.25rem 3rem', borderRadius: '18px', border: 'none',
              background: 'var(--accent-color)', color: 'white', fontWeight: '900',
              fontSize: '1.1rem', cursor: 'pointer', display: 'inline-flex', 
              alignItems: 'center', gap: '0.8rem', boxShadow: '0 20px 40px -10px rgba(59, 130, 246, 0.4)'
            }}
          >
            {isCz ? 'Založit agenturu nyní' : 'Register Agency Now'} <ArrowRight size={20} />
          </button>
        </div>
      </div>

      <footer style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
        <p>{isCz ? 'Potřebujete pomoci s něčím jiným?' : 'Need help with something else?'} <span style={{ color: 'var(--accent-color)', cursor: 'pointer', fontWeight: '700' }}>{isCz ? 'Kontaktujte podporu' : 'Contact Support'}</span></p>
      </footer>
    </div>
  );
};

export default ManualView;
