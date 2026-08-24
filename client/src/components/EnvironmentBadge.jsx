/**
 * Pruh, který říká, že tohle není ostrý provoz.
 *
 * Náhledy pull requestů vypadají k nerozeznání od produkce. Dokud mířily na
 * produkční API, hrozilo, že v nich někdo „jen tak" smaže profil. Teď míří na
 * testovací backend a hrozí opak: že se testovací data nahlásí jako produkční
 * chyba. Obojí řeší to, že je prostředí vidět.
 *
 * V produkčním sestavení se nevykreslí nic — proměnná tam není nastavená.
 */
export default function EnvironmentBadge() {
  const prostredi = import.meta.env.VITE_NEXUS_ENVIRONMENT;
  if (!prostredi || prostredi === 'production') return null;

  // Pruh musí říkat pravdu, ne jen „tohle není produkce".
  //
  // Náhled pull requestu běží na novém frontendu, ale dokud nestojí testovací
  // backend, mluví s PRODUKČNÍ databází. Napsat tam „data nejsou ostrá" by
  // bylo horší než nenapsat nic — někdo by v dobré víře smazal skutečný profil.
  const jeStaging = prostredi === 'staging';
  const barva = jeStaging ? '#b45309' : '#b91c1c';
  const text = jeStaging
    ? 'TESTOVACÍ PROSTŘEDÍ — DATA NEJSOU OSTRÁ'
    : 'NÁHLED ZMĚN — POZOR, PRACUJETE S OSTRÝMI DATY';

  return (
    <div
      data-testid="environment-badge"
      role="status"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 2147483647,
        background: barva,
        color: 'white',
        textAlign: 'center',
        fontSize: '0.72rem',
        fontWeight: 800,
        letterSpacing: '0.08em',
        padding: '3px 8px calc(3px + env(safe-area-inset-bottom, 0px))',
        // Pruh nesmí překážet v klikání na to, co je pod ním — jinak by na
        // telefonu zakryl spodní navigaci a testovat by nešlo nic.
        pointerEvents: 'none',
      }}
    >
      {text}
    </div>
  );
}
