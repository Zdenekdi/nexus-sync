import React from 'react';
import { Shield, MessageSquare, MapPin, Phone, Smartphone, ClipboardCheck, Clock } from 'lucide-react';
import { useNexus } from '../context/ContextHook';

/**
 * Co o přihlášeném uživateli aplikace eviduje.
 *
 * Vzniklo kvůli kontrole komunikace (QaReview): manažerka může hodnotit
 * konkrétní zprávy operátorek, a lidé, kterých se to týká, o tom mají vědět.
 * Vyskakovací oznámení by se odkliklo a za týden by nikdo nevěděl co —
 * tohle je místo, na které se dá kdykoli vrátit a odkázat i mimo aplikaci.
 *
 * Obsah je odvozený z datového modelu, ne z marketingu. Když se model změní,
 * má se změnit i tahle stránka — proto je u každé položky uvedeno, odkud to
 * plyne. Neuvádět něco, co se ve skutečnosti ukládá, je horší než neuvést nic.
 *
 * Sdílení polohy je dnes ve featureLocks zamčené. Popsané je i tak, protože
 * až se odemkne, nesmí to být překvapení.
 */
const Section = ({ icon: Icon, title, children, note }) => (
  <div style={{ padding: '1.25rem', borderRadius: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.6rem' }}>
      <Icon size={17} color="#60a5fa" style={{ flex: 'none' }} />
      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>{title}</h4>
    </div>
    <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{children}</div>
    {note && (
      <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>{note}</div>
    )}
  </div>
);

const DataTransparency = () => {
  const { lang, isMobile } = useNexus();
  const isCz = lang === 'cz';

  return (
    <div
      data-testid="page-data-transparency"
      style={{ padding: isMobile ? '1.5rem 1rem' : '2rem', flex: 1, overflowY: 'auto', maxWidth: '860px' }}
      className="fade-in custom-scrollbar"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <Shield size={22} color="#60a5fa" />
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900' }}>
          {isCz ? 'Co o vás aplikace eviduje' : 'What this app records about you'}
        </h2>
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7, marginBottom: '1.75rem' }}>
        {isCz
          ? 'Přehled toho, co se při práci v Nexus Hubu ukládá a kdo se na to může podívat. Je sepsaný podle toho, co aplikace opravdu dělá — ne podle toho, jak by to znělo lépe.'
          : 'What Nexus Hub stores while you work, and who can see it. Written from what the app actually does — not from what would sound better.'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        <Section icon={MessageSquare} title={isCz ? 'Zprávy klientům' : 'Client messages'}>
          {isCz
            ? 'Ukládá se text zprávy, čas a to, kdo ji odeslal. Zprávy vidí operátorky přiřazené k profilu a vedení agentury.'
            : 'The message text, time and who sent it. Visible to operators assigned to the profile and to agency management.'}
        </Section>

        <Section
          icon={ClipboardCheck}
          title={isCz ? 'Kontrola komunikace' : 'Communication review'}
          note={isCz
            ? 'Hodnocení se maže spolu s konverzací, ke které patří.'
            : 'A review is deleted together with the conversation it belongs to.'}
        >
          {isCz
            ? 'Vedoucí role mohou u jednotlivých zpráv zapsat hodnocení a poznámku. U hodnocení je vidět, kdo zprávu napsal a kdo ji hodnotil. Operátorky do těchto hodnocení nevidí.'
            : 'Managers can rate individual messages and add a note. Each review records who wrote the message and who reviewed it. Operators cannot see these reviews.'}
        </Section>

        <Section
          icon={MapPin}
          title={isCz ? 'Poloha' : 'Location'}
          note={isCz
            ? 'Tato funkce je zatím vypnutá. Popsaná je proto, aby její zapnutí nebylo překvapení.'
            : 'This feature is currently switched off. Described here so that enabling it is not a surprise.'}
        >
          {isCz
            ? 'Poloha se zaznamenává výhradně během probíhající bezpečnostní relace — tedy od check-inu do jejího ukončení. Mimo relaci se nezaznamenává vůbec.'
            : 'Location is recorded only during an active safety session — from check-in until it ends. Outside a session it is not recorded at all.'}
        </Section>

        <Section icon={Clock} title={isCz ? 'Bezpečnostní relace' : 'Safety sessions'}>
          {isCz
            ? 'Čas check-inu, plánovaný konec, případná eskalace a její vyřešení. Slouží k tomu, aby se poznalo, že se někdo neozval včas.'
            : 'Check-in time, planned end, any escalation and how it was resolved. Used to notice when someone has not checked in on time.'}
        </Section>

        <Section icon={Phone} title={isCz ? 'Hovory' : 'Calls'}>
          {isCz
            ? 'Telefonní číslo protistrany, délka hovoru a jeho stav. Obsah hovoru se nenahrává ani nepřepisuje.'
            : 'The other party’s number, call duration and status. Call audio is not recorded or transcribed.'}
        </Section>

        <Section icon={Smartphone} title={isCz ? 'Zařízení' : 'Devices'}>
          {isCz
            ? 'U spárovaného telefonu se eviduje model, platforma a čas poslední aktivity. Obsah telefonu aplikace nečte.'
            : 'For a paired phone: model, platform and time of last activity. The app does not read the phone’s contents.'}
        </Section>
      </div>

      <p style={{ marginTop: '1.75rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.7 }}>
        {isCz
          ? 'Máte-li otázku k tomu, co je tu uvedené, obraťte se na vedení své agentury. Pokud v aplikaci narazíte na něco, co se ukládá a není to tu popsané, dejte vědět — je to chyba na naší straně.'
          : 'If you have a question about anything listed here, contact your agency management. If you find something the app stores that is not described here, let us know — that is a mistake on our side.'}
      </p>
    </div>
  );
};

export default DataTransparency;
