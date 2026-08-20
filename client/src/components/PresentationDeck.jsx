import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Printer, MessageSquare, Phone, ShieldCheck,
  Users, CalendarCheck, Lock, Check
} from 'lucide-react';
import { useNexus } from '../context/ContextHook';

/**
 * Prezentace pro zájemce — proklikávací na obrazovce, tisknutelná do PDF.
 *
 * Obsah smí tvrdit jen to, co dnes prokazatelně funguje. Zamčené funkce
 * (featureLocks.js: phone-tracking, voice-sos, ghost-call, web-automation,
 * physical-tracker, gsm-call-bridge) se sem NESMÍ dostat ani náznakem —
 * stažené PDF koluje dál a nemáme nad ním kontrolu. Hlídá to test
 * `tests/prezentace.spec.js`, ne jen dobrá vůle.
 *
 * Ceny jsou schválně opsané z LandingPage, ne dopočítané: zrcadlí Stripe
 * PLAN_MAP a musí zůstat znak po znaku stejné.
 */

const OBSAH = {
  cz: {
    tlacitkaZpet: 'Zpět',
    tisk: 'Stáhnout PDF',
    zeSnimku: 'Snímek',
    z: 'z',
    vstoupit: 'Vyzkoušet',
    snimky: [
      {
        klic: 'titul',
        typ: 'titul',
        nadpis: 'Nexus Hub',
        podnadpis: 'Provoz a bezpečnost pro agentury',
        text: 'Sdílená schránka, kalendář rezervací, fakturace — a bezpečnostní dohled, který hlídá check-iny a rozešle SOS celému týmu naráz.',
      },
      {
        klic: 'problem',
        typ: 'seznam',
        oci: 'S ČÍM SE TO PERE',
        nadpis: 'Provoz agentury bez systému',
        body: [
          { nadpis: 'Komunikace v soukromých telefonech', text: 'Když operátorka odejde, odejde s ní i historie konverzací a kontakt na klienta.' },
          { nadpis: 'Rezervace v tabulce', text: 'Nikdo nevidí v reálném čase, co je obsazené, a dvojité rezervace se řeší až telefonem.' },
          { nadpis: 'O schůzce ví jen ten, kdo na ni jel', text: 'Když se někdo neozve, začíná se od otázky „kde vlastně je?".' },
        ],
      },
      {
        klic: 'pilire',
        typ: 'dlazdice',
        oci: 'NA ČEM TO STOJÍ',
        nadpis: 'Tři věci na jednom místě',
        dlazdice: [
          { ikona: MessageSquare, nadpis: 'Komunikace', text: 'SMS i chaty celé agentury v jedné schránce. Historie zůstává firmě.' },
          { ikona: CalendarCheck, nadpis: 'Provoz', text: 'Rezervace, profily, role a fakturace přes Stripe.' },
          { ikona: ShieldCheck, nadpis: 'Bezpečnost', text: 'Relace před schůzkou, check-iny a SOS celému týmu naráz.' },
        ],
      },
      {
        klic: 'schranka',
        typ: 'seznam',
        oci: 'KOMUNIKACE',
        nadpis: 'Sdílená schránka',
        body: [
          { nadpis: 'SMS z firemního čísla', text: 'Telefon se SIM kartou funguje jako relé. Operátorka píše z aplikace, klientovi dorazí SMS z čísla profilu.' },
          { nadpis: 'Nikdo nedává vlastní číslo', text: 'Osobní telefon se do konverzace nedostane a při odchodu není co přenášet.' },
          { nadpis: 'Vidí to celý tým', text: 'Konverzaci může převzít kdokoli s oprávněním — s celou historií, ne od nuly.' },
        ],
      },
      {
        klic: 'hovory',
        typ: 'seznam',
        oci: 'TELEFONIE',
        nadpis: 'Příchozí i odchozí hovory',
        body: [
          { nadpis: 'Volání přímo z prohlížeče', text: 'Operátorka zavolá klientovi z aplikace, bez zvedání vlastního telefonu.' },
          { nadpis: 'Klient vidí číslo profilu', text: 'Na displeji se ukáže firemní číslo, ne osobní.' },
          { nadpis: 'Hovory patří k rezervaci', text: 'Záznam o hovoru sedí u konkrétního klienta a schůzky.' },
        ],
      },
      {
        klic: 'bezpecnost',
        typ: 'seznam',
        oci: 'BEZPEČNOST',
        nadpis: 'Dohled nad schůzkou',
        body: [
          { nadpis: 'Relace se založí předem', text: 'U schůzky je od začátku jasné, kdo kam jede a do kdy se má ozvat.' },
          { nadpis: 'Check-iny hlídá systém', text: 'Když potvrzení nepřijde včas, upozornění dostane tým — nikdo si to nemusí pamatovat.' },
          { nadpis: 'SOS jde všem naráz', text: 'Jedno stisknutí upozorní celý tým současně, ne jednoho člověka, který zrovna nemá telefon u sebe.' },
        ],
        poznamka: 'SOS tlačítko a check-iny jsou ve všech plánech včetně nejnižšího. Bezpečnost není příplatek.',
      },
      {
        klic: 'data',
        typ: 'dlazdice',
        oci: 'DATA A PŘÍSTUP',
        nadpis: 'Kdo co vidí',
        dlazdice: [
          { ikona: Lock, nadpis: 'Oddělené agentury', text: 'Vidíte jen data své agentury. Oddělení je vynucené na serveru, ne jen skryté v UI.' },
          { ikona: Users, nadpis: 'Role rozhodují', text: 'Uvnitř agentury určuje role, kdo smí číst a kdo měnit. Přístup si spravujete sami.' },
          { ikona: Phone, nadpis: 'Dohledatelné změny', text: 'Zásahy do citlivých dat zůstávají v záznamu.' },
        ],
      },
      {
        klic: 'cenik',
        typ: 'cenik',
        oci: 'CENÍK',
        nadpis: 'Plány a ceny',
        poznamka: 'Ceny za měsíc, bez DPH. Účtuje se počet profilů, ne počet operátorek.',
        plany: [
          { nazev: 'Starter', cena: '290 Kč', popis: 'Ideální pro začínající týmy.', body: ['Správa 5 profilů', 'SOS alerty', 'Manuální SMS routing'] },
          { nazev: 'Professional', cena: '990 Kč', popis: 'Pro rostoucí profesionály.', body: ['Správa 10 profilů', 'AI Optimalizace', 'Pokročilé reporty'], oblibeny: true },
          { nazev: 'Agency', cena: '2 490 Kč', popis: 'Širší provoz pro agentury.', body: ['Správa 20 profilů', 'API Přístup', 'Prioritní podpora'] },
        ],
      },
      {
        klic: 'start',
        typ: 'kroky',
        oci: 'ZAČÁTEK',
        nadpis: 'Rozjezd za jedno odpoledne',
        kroky: [
          { cislo: '1', nadpis: 'Založíte agenturu', text: 'Bez zadávání karty. Zkoušet můžete naprázdno.' },
          { cislo: '2', nadpis: 'Pozvete lidi kódem', text: 'Každý si účet založí sám, vy jen rozdělíte role.' },
          { cislo: '3', nadpis: 'Připojíte telefon se SIM', text: 'Relay aplikace propojí firemní číslo se schránkou.' },
        ],
      },
      {
        klic: 'zaver',
        typ: 'titul',
        nadpis: 'Přejděte z Excelu za jedno odpoledne.',
        podnadpis: 'Bez instalace, běží v prohlížeči',
        text: 'Česky i anglicky. Tarif změníte kdykoli.',
      },
    ],
  },
  en: {
    tlacitkaZpet: 'Back',
    tisk: 'Download PDF',
    zeSnimku: 'Slide',
    z: 'of',
    vstoupit: 'Try it',
    snimky: [
      {
        klic: 'titul',
        typ: 'titul',
        nadpis: 'Nexus Hub',
        podnadpis: 'Operations and safety for agencies',
        text: 'A shared inbox, a booking calendar, billing — and safety oversight that watches check-ins and sends SOS to the whole team at once.',
      },
      {
        klic: 'problem',
        typ: 'seznam',
        oci: 'THE PROBLEM',
        nadpis: 'Running an agency without a system',
        body: [
          { nadpis: 'Conversations on private phones', text: 'When an operator leaves, the message history and the client contact leave with them.' },
          { nadpis: 'Bookings in a spreadsheet', text: 'Nobody sees availability in real time, and double bookings get sorted out by phone.' },
          { nadpis: 'Only one person knows about the meeting', text: 'When someone goes quiet, you start from "where are they, actually?".' },
        ],
      },
      {
        klic: 'pilire',
        typ: 'dlazdice',
        oci: "WHAT IT'S BUILT ON",
        nadpis: 'Three things in one place',
        dlazdice: [
          { ikona: MessageSquare, nadpis: 'Messaging', text: 'The whole agency’s SMS and chats in one inbox. History stays with the company.' },
          { ikona: CalendarCheck, nadpis: 'Operations', text: 'Bookings, profiles, roles and billing through Stripe.' },
          { ikona: ShieldCheck, nadpis: 'Safety', text: 'A session before the meeting, check-ins, and SOS to the whole team at once.' },
        ],
      },
      {
        klic: 'schranka',
        typ: 'seznam',
        oci: 'MESSAGING',
        nadpis: 'Shared inbox',
        body: [
          { nadpis: 'SMS from the company number', text: 'A phone with a SIM acts as a relay. The operator types in the app; the client gets an SMS from the profile’s number.' },
          { nadpis: 'Nobody hands out their own number', text: 'Personal phones stay out of the conversation, and there is nothing to hand over when someone leaves.' },
          { nadpis: 'The whole team can see it', text: 'Anyone with permission can pick up a conversation — with the full history, not from scratch.' },
        ],
      },
      {
        klic: 'hovory',
        typ: 'seznam',
        oci: 'TELEPHONY',
        nadpis: 'Inbound and outbound calls',
        body: [
          { nadpis: 'Call straight from the browser', text: 'Operators call clients from the app without picking up their own phone.' },
          { nadpis: 'The client sees the profile number', text: 'The company number shows on the display, not a personal one.' },
          { nadpis: 'Calls belong to the booking', text: 'The call record sits with the right client and meeting.' },
        ],
      },
      {
        klic: 'bezpecnost',
        typ: 'seznam',
        oci: 'SAFETY',
        nadpis: 'Oversight of a meeting',
        body: [
          { nadpis: 'The session starts beforehand', text: 'From the outset it is clear who is going where and by when they must check in.' },
          { nadpis: 'The system watches check-ins', text: 'If a confirmation does not arrive in time, the team is alerted — nobody has to remember.' },
          { nadpis: 'SOS reaches everyone at once', text: 'One press alerts the whole team simultaneously, not one person who happens to be away from their phone.' },
        ],
        poznamka: 'The SOS button and check-ins are in every plan, including the cheapest one. Safety is not an add-on.',
      },
      {
        klic: 'data',
        typ: 'dlazdice',
        oci: 'DATA AND ACCESS',
        nadpis: 'Who sees what',
        dlazdice: [
          { ikona: Lock, nadpis: 'Separated agencies', text: 'You only ever see your own agency’s data. The separation is enforced on the server, not just hidden in the UI.' },
          { ikona: Users, nadpis: 'Roles decide', text: 'Inside the agency, roles decide who may read and who may change what. You manage that yourselves.' },
          { ikona: Phone, nadpis: 'Changes are traceable', text: 'Actions on sensitive data stay on the record.' },
        ],
      },
      {
        klic: 'cenik',
        typ: 'cenik',
        oci: 'PRICING',
        nadpis: 'Plans & Pricing',
        poznamka: 'Prices per month, excl. VAT. You are billed per profile, not per operator.',
        plany: [
          { nazev: 'Starter', cena: '€12', popis: 'Perfect for starting teams.', body: ['5 Profiles', 'SOS Alerts', 'Manual SMS Routing'] },
          { nazev: 'Professional', cena: '€39', popis: 'For growing professionals.', body: ['10 Profiles', 'AI Optimization', 'Advanced Reports'], oblibeny: true },
          { nazev: 'Agency', cena: '€99', popis: 'Broader operations for agencies.', body: ['20 Profiles', 'API Access', 'Priority Support'] },
        ],
      },
      {
        klic: 'start',
        typ: 'kroky',
        oci: 'GETTING STARTED',
        nadpis: 'Up and running in one afternoon',
        kroky: [
          { cislo: '1', nadpis: 'Create the agency', text: 'No card required. You can try it empty.' },
          { cislo: '2', nadpis: 'Invite people with a code', text: 'Everyone signs themselves up; you just assign the roles.' },
          { cislo: '3', nadpis: 'Connect a phone with a SIM', text: 'The relay app links the company number to the inbox.' },
        ],
      },
      {
        klic: 'zaver',
        typ: 'titul',
        nadpis: 'Move off spreadsheets in one afternoon.',
        podnadpis: 'No install, runs in your browser',
        text: 'Czech and English. Change your plan anytime.',
      },
    ],
  },
};

const BARVA = { modra: '#3b82f6', tlum: 'rgba(255,255,255,0.62)', ram: 'rgba(255,255,255,0.08)' };

function Oci({ text }) {
  if (!text) return null;
  return (
    <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.18em', color: BARVA.modra, marginBottom: '0.9rem' }}>
      {text}
    </div>
  );
}

function Snimek({ s }) {
  const nadpisStyl = { fontSize: 'clamp(1.7rem, 4vw, 2.9rem)', fontWeight: 900, lineHeight: 1.1, margin: '0 0 2rem' };

  if (s.typ === 'titul') {
    return (
      <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto' }}>
        <img src="/nexus_icon.png" alt="" style={{ width: 60, height: 60, borderRadius: 14, marginBottom: '1.6rem' }} />
        <h2 style={{ ...nadpisStyl, marginBottom: '1rem' }}>{s.nadpis}</h2>
        <p style={{ fontSize: '1.15rem', fontWeight: 700, color: BARVA.modra, margin: '0 0 1.2rem' }}>{s.podnadpis}</p>
        <p className="prezentace-tlum" style={{ fontSize: '1.02rem', lineHeight: 1.7, color: BARVA.tlum, margin: 0 }}>{s.text}</p>
      </div>
    );
  }

  if (s.typ === 'seznam') {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        <Oci text={s.oci} />
        <h2 style={nadpisStyl}>{s.nadpis}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
          {s.body.map((b) => (
            <div key={b.nadpis} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <Check size={15} color={BARVA.modra} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.3rem' }}>{b.nadpis}</div>
                <div className="prezentace-tlum" style={{ color: BARVA.tlum, lineHeight: 1.6 }}>{b.text}</div>
              </div>
            </div>
          ))}
        </div>
        {s.poznamka && (
          <p className="prezentace-tlum" style={{ marginTop: '2rem', padding: '0.9rem 1.1rem', borderLeft: `3px solid ${BARVA.modra}`, background: 'rgba(59,130,246,0.06)', color: 'rgba(255,255,255,0.8)', fontSize: '0.93rem', lineHeight: 1.6 }}>
            {s.poznamka}
          </p>
        )}
      </div>
    );
  }

  if (s.typ === 'dlazdice') {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <Oci text={s.oci} />
        <h2 style={nadpisStyl}>{s.nadpis}</h2>
        <div className="prezentace-mrizka" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.2rem' }}>
          {s.dlazdice.map((d) => {
            const Ikona = d.ikona;
            return (
              <div key={d.nadpis} className="prezentace-karta" style={{ border: `1px solid ${BARVA.ram}`, borderRadius: 14, padding: '1.4rem', background: 'rgba(255,255,255,0.02)' }}>
                <Ikona size={24} color={BARVA.modra} style={{ marginBottom: '0.9rem' }} />
                <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.45rem' }}>{d.nadpis}</div>
                <div className="prezentace-tlum" style={{ color: BARVA.tlum, lineHeight: 1.6, fontSize: '0.93rem' }}>{d.text}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (s.typ === 'cenik') {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <Oci text={s.oci} />
        <h2 style={{ ...nadpisStyl, marginBottom: '1.4rem' }}>{s.nadpis}</h2>
        <div className="prezentace-mrizka" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.2rem' }}>
          {s.plany.map((p) => (
            <div key={p.nazev} className="prezentace-karta" style={{
              border: p.oblibeny ? `1px solid ${BARVA.modra}` : `1px solid ${BARVA.ram}`,
              borderRadius: 14, padding: '1.5rem',
              background: p.oblibeny ? 'rgba(59,130,246,0.07)' : 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ fontWeight: 800, letterSpacing: '0.06em', fontSize: '0.85rem', color: BARVA.modra, marginBottom: '0.6rem' }}>{p.nazev.toUpperCase()}</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 900, marginBottom: '0.4rem' }}>{p.cena}</div>
              <div className="prezentace-tlum" style={{ color: BARVA.tlum, fontSize: '0.9rem', marginBottom: '1.1rem' }}>{p.popis}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {p.body.map((b) => (
                  <div key={b} style={{ display: 'flex', gap: '0.55rem', alignItems: 'center', fontSize: '0.9rem' }}>
                    <Check size={14} color={BARVA.modra} style={{ flexShrink: 0 }} /> {b}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="prezentace-tlum" style={{ marginTop: '1.4rem', color: BARVA.tlum, fontSize: '0.88rem' }}>{s.poznamka}</p>
      </div>
    );
  }

  // kroky
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      <Oci text={s.oci} />
      <h2 style={nadpisStyl}>{s.nadpis}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {s.kroky.map((k) => (
          <div key={k.cislo} style={{ display: 'flex', gap: '1.2rem', alignItems: 'flex-start' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: BARVA.modra, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, flexShrink: 0 }}>
              {k.cislo}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.08rem', marginBottom: '0.3rem' }}>{k.nadpis}</div>
              <div className="prezentace-tlum" style={{ color: BARVA.tlum, lineHeight: 1.6 }}>{k.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PresentationDeck() {
  const { lang, navigate } = useNexus();
  const o = OBSAH[lang === 'en' ? 'en' : 'cz'];
  const pocet = o.snimky.length;
  const [index, setIndex] = useState(0);
  const dotykRef = useRef(null);

  const dal = useCallback(() => setIndex((i) => Math.min(i + 1, pocet - 1)), [pocet]);
  const zpet = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    const naKlavesu = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') dal();
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') zpet();
    };
    window.addEventListener('keydown', naKlavesu);
    return () => window.removeEventListener('keydown', naKlavesu);
  }, [dal, zpet]);

  const dotykStart = (e) => { dotykRef.current = e.touches[0].clientX; };
  const dotykKonec = (e) => {
    if (dotykRef.current === null) return;
    const posun = e.changedTouches[0].clientX - dotykRef.current;
    dotykRef.current = null;
    if (Math.abs(posun) < 50) return;
    if (posun < 0) dal(); else zpet();
  };

  return (
    <div className="prezentace" style={{ background: '#040507', color: 'white', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="prezentace-ovladani" style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${BARVA.ram}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: '#181c26', border: 'none', color: 'white', padding: '8px 15px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}
        >
          <ArrowLeft size={18} /> {o.tlacitkaZpet}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            data-testid="prezentace-tisk"
            onClick={() => window.print()}
            style={{ background: 'transparent', border: `1px solid ${BARVA.ram}`, color: 'white', padding: '8px 15px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}
          >
            <Printer size={16} /> {o.tisk}
          </button>
          <button
            onClick={() => navigate('/register', 'register-agency')}
            style={{ background: BARVA.modra, border: 'none', color: 'white', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 800 }}
          >
            {o.vstoupit}
          </button>
        </div>
      </nav>

      <div
        data-testid="prezentace-plocha"
        className="prezentace-plocha"
        onTouchStart={dotykStart}
        onTouchEnd={dotykKonec}
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(1.5rem, 5vw, 4rem)' }}
      >
        {/* Na obrazovce je vidět jeden snímek. Při tisku se zobrazí všechny,
            každý na vlastní stránce — proto se v DOMu drží pořád všechny
            a schovává je CSS, ne podmíněné vykreslení. */}
        {o.snimky.map((s, i) => (
          <section
            key={s.klic}
            data-testid={`prezentace-snimek-${s.klic}`}
            className="prezentace-snimek"
            aria-hidden={i !== index ? 'true' : undefined}
            style={{ display: i === index ? 'block' : 'none', width: '100%' }}
          >
            <Snimek s={s} />
          </section>
        ))}
      </div>

      <nav className="prezentace-ovladani" style={{ padding: '1rem 1.5rem', borderTop: `1px solid ${BARVA.ram}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          data-testid="prezentace-predchozi"
          onClick={zpet}
          disabled={index === 0}
          style={{ background: 'transparent', border: `1px solid ${BARVA.ram}`, color: 'white', padding: '9px 16px', borderRadius: 8, cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.35 : 1, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}
        >
          <ArrowLeft size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {o.snimky.map((s, i) => (
              <button
                key={s.klic}
                aria-label={`${o.zeSnimku} ${i + 1}`}
                onClick={() => setIndex(i)}
                style={{ width: i === index ? 22 : 7, height: 7, borderRadius: 4, border: 'none', padding: 0, cursor: 'pointer', background: i === index ? BARVA.modra : 'rgba(255,255,255,0.22)', transition: 'width 0.25s' }}
              />
            ))}
          </div>
          <span data-testid="prezentace-pocitadlo" className="prezentace-tlum" style={{ color: BARVA.tlum, fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>
            {index + 1} {o.z} {pocet}
          </span>
        </div>

        <button
          data-testid="prezentace-dalsi"
          onClick={dal}
          disabled={index === pocet - 1}
          style={{ background: 'transparent', border: `1px solid ${BARVA.ram}`, color: 'white', padding: '9px 16px', borderRadius: 8, cursor: index === pocet - 1 ? 'not-allowed' : 'pointer', opacity: index === pocet - 1 ? 0.35 : 1, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}
        >
          <ArrowRight size={16} />
        </button>
      </nav>
    </div>
  );
}
