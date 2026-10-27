#!/usr/bin/env bash
#
# Jednorázový ŠIFROVANÝ archiv databáze — pro zmrazení projektu.
#
# Tohle není rotující záloha (od té je backup-postgres.sh). Tohle je poslední
# export před tím, než se provoz vypne: zašifrovaný balík, který se někam uloží
# a roky se na něj nesahá. Proto jsou tu věci, které běžná záloha nepotřebuje:
#
#   - archiv se po zašifrování ZKUŠEBNĚ ROZŠIFRUJE a ověří, a teprve pak se maže
#     nešifrovaný mezivýsledek. Bez toho hrozí, že se smaže jediná čitelná kopie
#     a vadný archiv se objeví až za rok, kdy už není z čeho obnovit.
#   - uvnitř archivu je manifest s počty řádků po tabulkách, takže jde později
#     ověřit úplnost, aniž by se archiv musel obnovovat do databáze.
#   - heslo se NIKDY nepředává argumentem. Argumenty jsou v `ps` vidět všem
#     uživatelům stroje; proto jen soubor přes ARCHIVE_PASSPHRASE_FILE.
#
# Použití (na backend serveru, kde je pg_dump a DATABASE_URL):
#
#   ARCHIVE_PASSPHRASE_FILE=/root/archiv-heslo.txt \
#   ARCHIVE_DIR=/var/backups/nexus-archiv \
#   bash server/scripts/archive-encrypted.sh
#
# Heslo si vygeneruj takhle a ULOŽ MIMO SERVER (správce hesel, papír do trezoru):
#
#   openssl rand -base64 48 > /root/archiv-heslo.txt && chmod 600 /root/archiv-heslo.txt
#
# Bez hesla archiv NEJDE otevřít. Žádná zadní vrátka nejsou.
#
# Rozšifrování později:
#
#   gpg --batch --passphrase-file <heslo> --decrypt nexus-archiv_*.tar.gz.gpg \
#     | tar -xzf - -C /kam/to/rozbalit
#
set -euo pipefail
umask 077

# ── Vstupy ────────────────────────────────────────────────────────────────────

if [ -z "${DATABASE_URL:-}" ] && [ -f .env ]; then
  DATABASE_URL="$(node -e "require('dotenv').config(); if (!process.env.DATABASE_URL) process.exit(1); process.stdout.write(process.env.DATABASE_URL)")"
  export DATABASE_URL
fi

: "${DATABASE_URL:?DATABASE_URL je povinná}"
: "${ARCHIVE_PASSPHRASE_FILE:?ARCHIVE_PASSPHRASE_FILE je povinná (cesta k souboru s heslem)}"

ARCHIVE_DIR="${ARCHIVE_DIR:-/var/backups/nexus-archiv}"

[ -f "$ARCHIVE_PASSPHRASE_FILE" ] || { echo "❌ Soubor s heslem neexistuje: $ARCHIVE_PASSPHRASE_FILE" >&2; exit 1; }

# Krátké heslo u archivu, který má vydržet roky, je totéž co žádné heslo.
# Čte se bez `$(...)`, aby se obsah hesla nedostal do proměnné a odtud do logu.
pass_len="$(wc -c < "$ARCHIVE_PASSPHRASE_FILE" | tr -d '[:space:]')"
if [ "${pass_len:-0}" -lt 20 ]; then
  echo "❌ Heslo má jen ${pass_len} B. Archiv tohohle typu chce aspoň 20 B entropie." >&2
  echo "   Vygeneruj: openssl rand -base64 48 > $ARCHIVE_PASSPHRASE_FILE" >&2
  exit 1
fi

for t in pg_dump pg_restore gpg tar; do
  command -v "$t" >/dev/null 2>&1 || { echo "❌ Chybí nástroj: $t" >&2; exit 1; }
done

mkdir -p "$ARCHIVE_DIR"

timestamp="$(date -u +"%Y%m%dT%H%M%SZ")"
archive_file="$ARCHIVE_DIR/nexus-archiv_${timestamp}.tar.gz.gpg"

# Nešifrované mezivýsledky žijí jen tady a úklid běží i při selhání — jinak by
# po spadlém běhu zůstal na disku čitelný dump s osobními údaji.
workdir="$(mktemp -d)"
cleanup() {
  if command -v shred >/dev/null 2>&1; then
    find "$workdir" -type f -exec shred -u {} + 2>/dev/null || true
  fi
  rm -rf "$workdir"
}
trap cleanup EXIT INT TERM

# ── 1. Dump ───────────────────────────────────────────────────────────────────

echo "→ Exportuji databázi…"
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="$workdir/nexus.dump"

dump_size="$(wc -c < "$workdir/nexus.dump" | tr -d '[:space:]')"
[ "${dump_size:-0}" -ge 1024 ] || { echo "❌ Podezřele malý dump (${dump_size:-0} B) — nearchivuji." >&2; exit 1; }
pg_restore --list "$workdir/nexus.dump" >/dev/null 2>&1 \
  || { echo "❌ Dump není čitelný, archivovat ho nemá smysl." >&2; exit 1; }

# ── 2. Manifest (počty řádků) ─────────────────────────────────────────────────
#
# Aby šlo za rok ověřit, že archiv je úplný, aniž by se musel obnovit do živé
# databáze. psql tu nemusí být — pak se manifest přeskočí, ale archiv vznikne.

{
  echo "Nexus Hub — archiv databáze"
  echo "pořízeno: $timestamp (UTC)"
  echo "dump:     nexus.dump (pg_dump --format=custom, ${dump_size} B)"
  echo ""
  echo "Počty řádků v okamžiku archivace:"
} > "$workdir/manifest.txt"

if command -v psql >/dev/null 2>&1; then
  psql "$DATABASE_URL" --tuples-only --no-align --quiet -c "
    SELECT relname || ' = ' || n_live_tup
    FROM pg_stat_user_tables
    ORDER BY relname;
  " >> "$workdir/manifest.txt" 2>/dev/null \
    || echo "(počty se nepodařilo zjistit)" >> "$workdir/manifest.txt"
else
  echo "(psql není k dispozici — počty řádků nezjištěny)" >> "$workdir/manifest.txt"
fi

# ── 3. Zabalit a zašifrovat ───────────────────────────────────────────────────
#
# AES-256. GPG má vlastní kontrolu integrity (MDC), takže poškozený archiv se
# pozná při rozšifrování, ne až při obnovení.

echo "→ Šifruji…"
tar -czf - -C "$workdir" nexus.dump manifest.txt \
  | gpg --batch --yes --symmetric \
        --cipher-algo AES256 \
        --s2k-mode 3 --s2k-count 65011712 \
        --passphrase-file "$ARCHIVE_PASSPHRASE_FILE" \
        --output "$archive_file"

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$archive_file" > "$archive_file.sha256"
else
  shasum -a 256 "$archive_file" > "$archive_file.sha256"
fi

# ── 4. Ověřit, že archiv JDE otevřít ──────────────────────────────────────────
#
# Tohle je ten důvod, proč se nešifrovaný dump maže až tady. Ověřuje se celý
# řetěz: rozšifrování → rozbalení → čitelnost dumpu.

echo "→ Ověřuji archiv…"
verify_dir="$workdir/overeni"
mkdir -p "$verify_dir"

gpg --batch --quiet --decrypt \
    --passphrase-file "$ARCHIVE_PASSPHRASE_FILE" \
    "$archive_file" 2>/dev/null \
  | tar -xzf - -C "$verify_dir" \
  || { echo "❌ Archiv nejde rozšifrovat nebo rozbalit. Nešifrovaný dump ZŮSTÁVÁ v $workdir — zachraň ho." >&2; trap - EXIT; exit 1; }

pg_restore --list "$verify_dir/nexus.dump" >/dev/null 2>&1 \
  || { echo "❌ Dump uvnitř archivu není čitelný. Nešifrovaný dump ZŮSTÁVÁ v $workdir." >&2; trap - EXIT; exit 1; }

orig_sum="$(shasum -a 256 "$workdir/nexus.dump" | awk '{print $1}')"
copy_sum="$(shasum -a 256 "$verify_dir/nexus.dump" | awk '{print $1}')"
[ "$orig_sum" = "$copy_sum" ] \
  || { echo "❌ Dump v archivu se liší od původního. Nešifrovaný dump ZŮSTÁVÁ v $workdir." >&2; trap - EXIT; exit 1; }

# ── Hotovo ────────────────────────────────────────────────────────────────────

archive_size="$(wc -c < "$archive_file" | tr -d '[:space:]')"

cat <<EOF

✅ Archiv je hotový a ověřený.

   soubor:   $archive_file
   velikost: ${archive_size} B
   checksum: $archive_file.sha256

   Ověřeno: archiv jde rozšifrovat, rozbalit a dump uvnitř je čitelný
   a bajt po bajtu shodný s původním.

Co udělat teď:

   1. Zkopíruj archiv i .sha256 MIMO tenhle server (dva různé fyzické cíle).
   2. Ulož heslo odděleně od archivu. Bez něj je archiv nenávratně ztracený.
   3. Teprve potom smaž produkční databázi — a ověř, že archiv jde otevřít
      z té kopie, kterou sis odnesl, ne z téhle.

Nešifrovaný dump byl smazán.
EOF
