#!/usr/bin/env node
/**
 * Hlídá klíče, které kód volá přes t(), ale v translations.js nejsou.
 *
 * Proč to potřebuje vlastní kontrolu: `t()` při chybějícím klíči vrací SÁM
 * KLÍČ, takže se uživateli zobrazí třeba „inventorySystem“. Nic to nenahlásí —
 * ani lint, ani build, ani konzole. A obranný zápis `t('klic') || 'záloha'`
 * nepomůže: vrácený klíč je pravdivostně true, takže se záloha nepoužije.
 *
 * V srpnu 2026 takhle chybělo 75 klíčů, mimo jiné pět nadpisů stránek.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOREN = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const PREKLADY = join(KOREN, 'translations.js');

function vsechnySoubory(adresar) {
  return readdirSync(adresar).flatMap((jmeno) => {
    const cesta = join(adresar, jmeno);
    if (statSync(cesta).isDirectory()) return vsechnySoubory(cesta);
    return /\.(jsx?|mjs)$/.test(jmeno) ? [cesta] : [];
  });
}

/** Vytáhne jména klíčů ze sekce jazyka, včetně vnořených cest (a.b). */
function klice(blok) {
  const out = new Set();
  const stack = [];
  let i = 0;
  while (i < blok.length) {
    const m = /^([A-Za-z_]\w*)\s*:/.exec(blok.slice(i));
    if (m) {
      let j = i + m[0].length;
      while (j < blok.length && ' \t\n'.includes(blok[j])) j += 1;
      out.add([...stack, m[1]].join('.'));
      if (blok[j] === '{') { stack.push(m[1]); i = j + 1; continue; }
      i += m[0].length; continue;
    }
    if (blok[i] === '{') { stack.push('?'); i += 1; continue; }
    if (blok[i] === '}') { stack.pop(); i += 1; continue; }
    i += 1;
  }
  return out;
}

function sekce(zdroj, jazyk) {
  const m = new RegExp(`^\\s*${jazyk}\\s*:\\s*\\{`, 'm').exec(zdroj);
  if (!m) return '';
  let i = m.index + m[0].length;
  let hloubka = 1;
  while (hloubka && i < zdroj.length) {
    if (zdroj[i] === '{') hloubka += 1;
    else if (zdroj[i] === '}') hloubka -= 1;
    i += 1;
  }
  return zdroj.slice(m.index + m[0].length, i);
}

const zdroj = readFileSync(PREKLADY, 'utf-8');
const cz = klice(sekce(zdroj, 'cz'));
const en = klice(sekce(zdroj, 'en'));

// Kontrolní vzorek: bez něj se nedá věřit ani výsledku „0 chybějících“.
const musiByt = ['dashboard', 'inbox', 'settings', 'navSections.overview'];
const nesmiByt = ['tohleUrciteNeexistuje', 'nesmysl_123'];
const spatne = [
  ...musiByt.filter((k) => !cz.has(k)),
  ...nesmiByt.filter((k) => cz.has(k)),
];
if (spatne.length) {
  console.error(`Kontrola překladů je sama rozbitá — vzorek selhal na: ${spatne.join(', ')}`);
  process.exit(2);
}

const volani = new Map();
for (const soubor of vsechnySoubory(KOREN)) {
  if (soubor.endsWith('translations.js')) continue;
  const text = readFileSync(soubor, 'utf-8');
  for (const m of text.matchAll(/\bt\(\s*'([A-Za-z_][\w.]*)'/g)) {
    if (!volani.has(m[1])) volani.set(m[1], soubor);
  }
}

const chybi = [];
for (const [klic, soubor] of volani) {
  const kde = [!cz.has(klic) && 'cz', !en.has(klic) && 'en'].filter(Boolean);
  if (kde.length) chybi.push({ klic, soubor: soubor.replace(`${KOREN}/`, ''), kde });
}

if (chybi.length) {
  console.error(`\nChybí ${chybi.length} překladových klíčů — uživateli se zobrazí samotný klíč:\n`);
  for (const { klic, soubor, kde } of chybi.sort((a, b) => a.klic.localeCompare(b.klic))) {
    console.error(`  ${klic}  (chybí v ${kde.join(', ')})  — ${soubor}`);
  }
  console.error('\nDoplň je do client/src/translations.js. Zápis t(\'klic\') || \'záloha\' nestačí:');
  console.error('t() vrací při chybějícím klíči sám klíč, který je pravdivostně true.\n');
  process.exit(1);
}

console.log(`OK: všech ${volani.size} volaných překladových klíčů existuje v cz i en.`);
