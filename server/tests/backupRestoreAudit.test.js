const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const scriptPath = path.join(__dirname, '..', 'scripts', 'audit-backup-restore.js');

function makeFakePgBin() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-pg-bin-'));
  for (const commandName of ['pg_dump', 'pg_restore', 'psql']) {
    const filePath = path.join(root, commandName);
    fs.writeFileSync(filePath, '#!/usr/bin/env sh\nexit 0\n');
    fs.chmodSync(filePath, 0o700);
  }
  return root;
}

function runAudit(extraEnv = {}) {
  return spawnSync(process.execPath, [scriptPath], {
    env: {
      PATH: process.env.PATH,
      NO_DOTENV: 'true',
      ...extraEnv
    },
    encoding: 'utf8'
  });
}

function validEnv() {
  const pgBin = makeFakePgBin();
  const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-backup-dir-'));
  const backupFile = path.join(backupDir, 'nexus_test.dump');
  fs.writeFileSync(backupFile, 'backup');
  fs.writeFileSync(`${backupFile}.sha256`, 'checksum');

  return {
    PATH: `${pgBin}${path.delimiter}${process.env.PATH || ''}`,
    STRICT_BACKUP_AUDIT: 'true',
    DATABASE_URL: 'postgresql://nexus:password@localhost:5432/nexus',
    RESTORE_DATABASE_URL: 'postgresql://nexus:password@localhost:5432/nexus_restore_verify',
    BACKUP_DIR: backupDir,
    BACKUP_FILE: backupFile,
    RETENTION_DAYS: '30'
  };
}

describe('backup/restore readiness audit', () => {
  it('passes strict mode with separate restore database and pg tooling available', () => {
    const result = runAudit(validEnv());

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Backup/restore readiness audit passed');
    expect(result.stdout).toContain('RESTORE_DATABASE_URL: configured');
  });

  it('rejects restore verification pointed at the production database even with different credentials', () => {
    const result = runAudit({
      ...validEnv(),
      DATABASE_URL: 'postgresql://prod_user@db.example.com:5432/nexus',
      RESTORE_DATABASE_URL: 'postgresql://restore_user@db.example.com:5432/nexus'
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('RESTORE_DATABASE_URL points to the same host/database as DATABASE_URL');
  });

  it('fails strict mode when restore verification inputs are missing', () => {
    const { RESTORE_DATABASE_URL, BACKUP_FILE, ...env } = validEnv();
    const result = runAudit(env);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('RESTORE_DATABASE_URL is missing');
    expect(result.stderr).toContain('BACKUP_FILE is required');
  });

  it('fails invalid retention settings before backup cleanup can run', () => {
    const result = runAudit({
      ...validEnv(),
      RETENTION_DAYS: '0'
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('RETENTION_DAYS must be a positive integer');
  });
});
