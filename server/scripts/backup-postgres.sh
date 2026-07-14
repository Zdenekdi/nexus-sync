#!/usr/bin/env bash
set -euo pipefail
umask 077

if [ -z "${DATABASE_URL:-}" ] && [ -f .env ]; then
  DATABASE_URL="$(node -e "require('dotenv').config(); if (!process.env.DATABASE_URL) process.exit(1); process.stdout.write(process.env.DATABASE_URL)")"
  export DATABASE_URL
fi

: "${DATABASE_URL:?DATABASE_URL is required}"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/nexus}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

timestamp="$(date -u +"%Y%m%dT%H%M%SZ")"
backup_file="$BACKUP_DIR/nexus_${timestamp}.dump"

pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="$backup_file"

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$backup_file" > "$backup_file.sha256"
else
  shasum -a 256 "$backup_file" > "$backup_file.sha256"
fi

# ── Ověření integrity čerstvé zálohy ──────────────────────────────────────────
# Bez tohoto by prázdný/uříznutý/poškozený dump prošel bez povšimnutí a "záloha"
# by při reálném obnovení selhala. Ověříme velikost, čitelnost archivu i checksum;
# při chybě smažeme vadný soubor a skončíme nenulově, ať to volající (cron/CI) pozná.
verify_fail() {
  echo "❌ Ověření zálohy selhalo: $1" >&2
  rm -f "$backup_file" "$backup_file.sha256"
  exit 1
}

actual_size="$(wc -c < "$backup_file" | tr -d '[:space:]')"
[ "${actual_size:-0}" -ge 1024 ] || verify_fail "podezřele malý dump (${actual_size:-0} B)"

# Custom formát umí --list bez skutečného obnovení → potvrdí, že archiv je čitelný.
if command -v pg_restore >/dev/null 2>&1; then
  pg_restore --list "$backup_file" >/dev/null 2>&1 || verify_fail "archiv není čitelný (pg_restore --list)"
fi

# Zpětné ověření checksumu.
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum -c "$backup_file.sha256" >/dev/null 2>&1 || verify_fail "checksum nesedí"
elif command -v shasum >/dev/null 2>&1; then
  shasum -a 256 -c "$backup_file.sha256" >/dev/null 2>&1 || verify_fail "checksum nesedí"
fi

echo "✅ Integrita zálohy ověřena (${actual_size} B, archiv čitelný, checksum OK)."

find "$BACKUP_DIR" -type f -name 'nexus_*.dump' -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -type f -name 'nexus_*.dump.sha256' -mtime "+$RETENTION_DAYS" -delete

echo "Backup written: $backup_file"
