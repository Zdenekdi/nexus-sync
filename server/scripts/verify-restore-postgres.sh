#!/usr/bin/env bash
set -euo pipefail

: "${BACKUP_FILE:?BACKUP_FILE is required}"
: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required}"

if [ -n "${DATABASE_URL:-}" ] && [ "$RESTORE_DATABASE_URL" = "$DATABASE_URL" ]; then
  echo "RESTORE_DATABASE_URL must not equal DATABASE_URL. Refusing to restore into the primary database." >&2
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

if [ -f "$BACKUP_FILE.sha256" ]; then
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum -c "$BACKUP_FILE.sha256"
  else
    shasum -a 256 -c "$BACKUP_FILE.sha256"
  fi
fi

pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --dbname "$RESTORE_DATABASE_URL" \
  "$BACKUP_FILE"

for table_name in Agency User Profile Chat Message Subscription DeviceBinding; do
  psql "$RESTORE_DATABASE_URL" \
    --set=ON_ERROR_STOP=1 \
    --command "SELECT '$table_name' AS table_name, COUNT(*) AS rows FROM \"$table_name\";"
done

echo "Restore verification finished for $BACKUP_FILE"
