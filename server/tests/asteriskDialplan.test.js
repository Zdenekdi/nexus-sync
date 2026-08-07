/**
 * Dialplan je čistá funkce — dá se ověřit bez Asterisku.
 *
 * Testuje se hlavně to, co by v provozu nešlo poznat: že se odchozí caller ID
 * bere z databáze, a ne z toho, co pošle prohlížeč. Kdyby si to směl vybrat
 * klient, mohla by operátorka volat pod cizím číslem.
 */

const { generateExtensionsConf } = require('../src/services/asteriskConfigGenerator');

const RELAY = {
  sipUser: 'relay1', agencyId: 'ag1',
  profileName: 'Lucie', phoneNumber: '+420777111222',
};
const OPERATOR = { sipUser: 'op1', agencyId: 'ag1', profileName: 'Jana' };
const TRUNK = {
  id: 'trunkA', agencyId: 'ag1', name: 'Provider',
  dids: [
    { number: '+420777111222', profileName: 'Lucie' },
    { number: '+420777333444', profileName: 'Nikola' },
  ],
};

const conf = () => generateExtensionsConf([RELAY], [OPERATOR], [TRUNK]);

describe('odchozí hovory v dialplanu', () => {
  it('vytvoří pravidlo pro každé DID z databáze', () => {
    const out = conf();
    expect(out).toContain('exten => _+420777111222*X.,1,');
    expect(out).toContain('exten => _+420777333444*X.,1,');
  });

  it('chytí cílové číslo i v E.164 s plusem', () => {
    // `X` je v Asterisku jen číslice — bez téhle varianty by hovor na
    // +420999… spadl na fallback a operátorka by slyšela jen zavěšení.
    expect(conf()).toContain('exten => _+420777111222*+X.,1,');
  });

  it('nastaví klientovi viditelné číslo na DID profilu', () => {
    expect(conf()).toContain(' same => n,Set(CALLERID(num)=+420777111222)');
    expect(conf()).toContain(' same => n,Set(CALLERID(name)=Lucie)');
  });

  it('vytočí zbytek za hvězdičkou přes trunk daného DID', () => {
    // +420777111222 má 13 znaků, s hvězdičkou 14 — číslo klienta začíná tam
    expect(conf()).toContain(' same => n,Dial(PJSIP/${EXTEN:14}@trunk_trunkA,60,rT)');
  });

  it('nedovolí zvolit číslo, které v databázi není', () => {
    const out = conf();
    // Neexistující DID nemá vlastní pravidlo, takže se pod ním volat nedá.
    expect(out).not.toContain('_+420999888777*');
    // Fallback pro neznámé cíle v kontextu zůstává.
    expect(out).toContain('exten => _X.,1,NoOp(Neznámé číslo: ${EXTEN})');
    expect(out).toContain(' same => n,Hangup(21)');
  });

  it('nepustí DID cizí agentury na cizí trunk', () => {
    // Pravidlo se skládá z DID a trunku, ke kterému DID patří — číslo
    // agentury A tedy nemůže odejít trunkem agentury B.
    const out = generateExtensionsConf([RELAY], [OPERATOR], [
      TRUNK,
      { id: 'trunkB', agencyId: 'ag2', name: 'Jiná', dids: [{ number: '+420555000111', profileName: 'Cizí' }] },
    ]);
    expect(out).toContain('exten => _+420777111222*X.,1,');
    expect(out).toContain('@trunk_trunkA,60,rT)');
    expect(out).not.toContain('_+420777111222*X.,1,NoOp(Odchozí hovor, klient uvidí +420555000111)');
    const cizi = out.split('\n').filter(l => l.includes('+420555000111') && l.includes('Dial('));
    expect(cizi.every(l => l.includes('@trunk_trunkB'))).toBe(true);
  });

  it('hovor NENAHRÁVÁ', () => {
    // Rozhodnuto 5. 8. 2026. Kdyby to někdo zapnul, ať to shodí test,
    // protože to má důsledky i pro stránku o evidenci údajů.
    expect(conf()).not.toMatch(/MixMonitor|Monitor\(/);
  });

  it('nerozbije příchozí směr', () => {
    const out = conf();
    expect(out).toContain('exten => +420777111222,1,Goto(nexushub,relay1,1)');
    expect(out).toContain('[from-trunk]');
  });

  it('bez trunků a bez DID neselže', () => {
    expect(() => generateExtensionsConf([RELAY], [OPERATOR], [])).not.toThrow();
    expect(() => generateExtensionsConf([], [], [{ ...TRUNK, dids: [] }])).not.toThrow();
  });

  it('odchozí pravidlo stojí před fallbackem', () => {
    // Asterisk sice vybírá podle konkrétnosti vzoru, ale pořadí v souboru
    // je to, co si při ladění přečte člověk.
    const out = conf();
    expect(out.indexOf('_+420777111222*X.')).toBeLessThan(out.indexOf('exten => _X.,1,'));
  });
});
