#!/usr/bin/env node
/**
 * Hlídá `var(--neco)`, kde `--neco` nikde není definované.
 *
 * Proč to potřebuje vlastní kontrolu: nedefinovaná `var()` NIC nenahlásí.
 * U `color:` se zdědí barva rodiče, u `background:` je hodnota neplatná
 * a použije se průhledná. Prvek se vykreslí, jen vypadá jinak, než měl —
 * a v konzoli ani buildu se neobjeví nic.
 *
 * V srpnu 2026 takhle nefungovalo 72 zápisů: 43× `--_err-color` (hromadné
 * přejmenování err → _err zasáhlo i CSS proměnné uvnitř inline stylů)
 * a 29× jména z jiné konvence (`--text-dim`, `--bg-main`, `--accent-primary`).
 * Varovné stavy proto nebyly červené a odznak nepřečtených měl průhledné
 * pozadí.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOREN = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

function soubory(adresar) {
  return readdirSync(adresar).flatMap((jmeno) => {
    const cesta = join(adresar, jmeno);
    if (statSync(cesta).isDirectory()) return soubory(cesta);
    return /\.(jsx?|mjs|css)$/.test(jmeno) ? [cesta] : [];
  });
}

/** Vyhodí komentáře, ať zmínka v komentáři nedělá planý poplach. */
function bezKomentaru(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

const definovane = new Set();
const pouzite = new Map();

for (const soubor of soubory(KOREN)) {
  const text = bezKomentaru(readFileSync(soubor, 'utf-8'));
  for (const m of text.matchAll(/(--[\w-]+)\s*:/g)) definovane.add(m[1]);
  for (const m of text.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) {
    if (!pouzite.has(m[1])) pouzite.set(m[1], { soubor, zaloha: false });
    if (m[2]) pouzite.get(m[1]).zaloha = true;
  }
}

// Kontrolní vzorek: bez něj se nedá věřit ani výsledku „0 nedefinovaných".
const musiByt = ['--error-color', '--accent-color', '--text-secondary'];
const nesmiByt = '--tahle-urcite-neexistuje';
const rozbite = [
  ...musiByt.filter((v) => !definovane.has(v)),
  ...(definovane.has(nesmiByt) ? [nesmiByt] : []),
];
if (rozbite.length) {
  console.error(`Kontrola je sama rozbitá — vzorek selhal na: ${rozbite.join(', ')}`);
  process.exit(2);
}

const chybi = [...pouzite.entries()].filter(([jmeno]) => !definovane.has(jmeno));

if (chybi.length) {
  console.error(`\nPoužívá se ${chybi.length} nedefinovaných CSS proměnných:\n`);
  for (const [jmeno, { soubor, zaloha }] of chybi.sort((a, b) => a[0].localeCompare(b[0]))) {
    const pozn = zaloha ? ' (má záložní hodnotu, ale jméno stejně neexistuje)' : '';
    console.error(`  ${jmeno}  — ${relative(KOREN, soubor)}${pozn}`);
  }
  console.error('\nPoužij proměnnou, která je v client/src/index.css, nebo ji tam doplň.');
  console.error('Nedefinovaná var() se nikde nenahlásí — jen se něco vykreslí jinak.\n');
  process.exit(1);
}

console.log(`OK: všech ${pouzite.size} použitých CSS proměnných je definovaných.`);
