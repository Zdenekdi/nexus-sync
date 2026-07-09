# Database backup and restore runbook

Nexus Hub production database is PostgreSQL via `DATABASE_URL`. Backups contain personal and operational data, so handle them as sensitive production data.

## Safety rules

- Never run `prisma db push --accept-data-loss` against production.
- Always create a fresh backup before migrations, deploys, bulk fixes or restore attempts.
- Verify every backup by restoring it to a separate database, not directly to production.
- Prefer restoring to a new database and switching `DATABASE_URL` over in-place production restore.
- Store backups off-host or in encrypted storage. A backup on the same VM is not disaster recovery.

## Manual backup

From the backend server:

```bash
cd /root/nexus-backend/server
DATABASE_URL="$DATABASE_URL" BACKUP_DIR=/var/backups/nexus npm run db:backup
```

The script writes a custom-format `pg_dump` file and a checksum:

- `/var/backups/nexus/nexus_YYYYMMDDTHHMMSSZ.dump`
- `/var/backups/nexus/nexus_YYYYMMDDTHHMMSSZ.dump.sha256`

Backup files are created with owner-only permissions via `umask 077`.
Default retention is 14 days. Override it with:

```bash
RETENTION_DAYS=30 npm run db:backup
```

## Automated schedule

Example cron entry:

```cron
15 2 * * * cd /root/nexus-backend/server && DATABASE_URL='postgresql://...' BACKUP_DIR=/var/backups/nexus RETENTION_DAYS=30 npm run db:backup >> /var/log/nexus-db-backup.log 2>&1
```

Recommended retention:

- Daily backups: 14 to 30 days.
- Weekly backups: 8 to 12 weeks.
- Monthly backups: 6 to 12 months.

Copy at least one daily backup off the app server.

## Pre-deploy backup

Before a deploy that includes Prisma migrations:

```bash
cd /root/nexus-backend/server
npm run db:backup
npx prisma migrate deploy
pm2 restart nexus-backend-final
```

If `npm run db:backup` fails, stop the deploy.

## Restore verification drill

Create an empty restore database first. Do not point `RESTORE_DATABASE_URL` to production.
The verification script refuses to run if `RESTORE_DATABASE_URL` equals `DATABASE_URL`.

```bash
createdb nexus_restore_verify
export RESTORE_DATABASE_URL='postgresql://nexus:password@localhost:5432/nexus_restore_verify'
export BACKUP_FILE='/var/backups/nexus/nexus_YYYYMMDDTHHMMSSZ.dump'
cd /root/nexus-backend/server
npm run db:restore:verify
```

Expected result:

- Checksum passes, if `.sha256` exists.
- `pg_restore` exits with code `0`.
- Row counts are printed for `Agency`, `User`, `Profile`, `Chat`, `Message`, `Subscription` and `DeviceBinding`.
- Optional staging backend can start against `RESTORE_DATABASE_URL`.

## Production restore

Use this only during an incident.

1. Announce maintenance window and stop user writes.
2. Stop backend workers and app processes.
3. Take an emergency backup of the current broken database.
4. Restore the selected backup into a new database.
5. Run `npm run db:restore:verify` against the new database.
6. Switch backend `DATABASE_URL` to the restored database.
7. Run `npx prisma migrate deploy`.
8. Restart backend.
9. Verify `/health` and `/api/admin/operational-health`.
10. Run an application smoke test: login, profiles, inbox, latest SMS, Stripe checkout status, Relay binding list.

In-place restore fallback:

```bash
pg_restore --clean --if-exists --no-owner --no-acl --dbname "$DATABASE_URL" "$BACKUP_FILE"
```

Only use in-place restore if switching to a new database is not possible.

## Restore acceptance checklist

- App Owner can log in.
- At least one agency, manager and profile are visible.
- Inbox loads recent chats and messages.
- Device bindings still map to correct profiles.
- Active subscriptions and agency plans are present.
- Stripe pending/active subscriptions are consistent with Stripe Dashboard.
- Relay phone can verify and send one inbound SMS.
- New outgoing SMS can move from `pending_relay` to `sent` or `failed`.
- `/health` returns `200`.
- `/api/admin/operational-health` is `ok` or has only understood non-blocking warnings.

## Backup failure alerting

If backups are scheduled through cron, send cron output to a monitored log or system mail. A silent failing backup job is equivalent to no backup.

Minimum operational practice:

- Check backup log daily.
- Perform restore verification weekly.
- Perform a full restore drill before pilot launch and after every database schema change.
