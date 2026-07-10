#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function stripQuotes(value) {
  const trimmed = String(value || '').trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvFile(filePath) {
  const loaded = [];
  if (!filePath || !fs.existsSync(filePath)) return loaded;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (!match) continue;
    const key = match[1];
    if (Object.prototype.hasOwnProperty.call(process.env, key)) continue;
    process.env[key] = stripQuotes(match[2]);
    loaded.push(key);
  }
  return loaded;
}

function loadDotenvCandidates() {
  if (process.env.NO_DOTENV === 'true') return [];

  const candidates = [
    process.env.RUNTIME_ENV_FILE,
    path.join(process.cwd(), '.env'),
    path.join(ROOT, '.env')
  ].filter(Boolean);

  const seen = new Set();
  const loadedFiles = [];
  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    const loaded = loadEnvFile(resolved);
    if (loaded.length > 0) loadedFiles.push(resolved);
  }
  return loadedFiles;
}

function value(key) {
  return String(process.env[key] || '').trim();
}

function has(key) {
  return Boolean(value(key));
}

function addIssue(issues, level, key, message) {
  issues.push({ level, key, message });
}

function parseDatabaseUrl(raw) {
  try {
    const parsed = new URL(raw);
    if (!/^postgres(?:ql)?:$/i.test(parsed.protocol)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function databaseFingerprint(parsed) {
  if (!parsed) return null;
  return [
    parsed.protocol.toLowerCase(),
    parsed.hostname.toLowerCase(),
    parsed.port || '5432',
    parsed.pathname.replace(/\/+$/, '')
  ].join('|');
}

function commandExists(commandName) {
  const pathValue = process.env.PATH || '';
  const extensions = process.platform === 'win32' ? ['', '.exe', '.cmd', '.bat'] : [''];
  for (const folder of pathValue.split(path.delimiter).filter(Boolean)) {
    for (const extension of extensions) {
      const candidate = path.join(folder, `${commandName}${extension}`);
      try {
        fs.accessSync(candidate, fs.constants.X_OK);
        return true;
      } catch {
        // Try the next PATH entry.
      }
    }
  }
  return false;
}

function canPrepareWritableDir(dirPath) {
  const resolved = path.resolve(dirPath);
  if (fs.existsSync(resolved)) {
    try {
      fs.accessSync(resolved, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  let parent = path.dirname(resolved);
  while (parent && parent !== path.dirname(parent)) {
    if (fs.existsSync(parent)) {
      try {
        fs.accessSync(parent, fs.constants.W_OK);
        return true;
      } catch {
        return false;
      }
    }
    parent = path.dirname(parent);
  }
  return false;
}

function validateBackupRestoreReadiness() {
  const loadedFiles = loadDotenvCandidates();
  const issues = [];
  const strict = process.env.STRICT_BACKUP_AUDIT === 'true';
  const requireRestore = strict || process.env.REQUIRE_RESTORE_VERIFY === 'true';

  const databaseUrl = has('DATABASE_URL') ? parseDatabaseUrl(value('DATABASE_URL')) : null;
  const restoreDatabaseUrl = has('RESTORE_DATABASE_URL') ? parseDatabaseUrl(value('RESTORE_DATABASE_URL')) : null;
  const backupDir = value('BACKUP_DIR') || '/var/backups/nexus';
  const retentionDays = value('RETENTION_DAYS') || '14';
  const backupFile = value('BACKUP_FILE');

  if (!databaseUrl) {
    addIssue(
      issues,
      strict ? 'error' : 'warning',
      'DATABASE_URL',
      has('DATABASE_URL') ? 'DATABASE_URL must be a PostgreSQL connection string.' : 'DATABASE_URL is missing.'
    );
  }

  for (const commandName of ['pg_dump', 'pg_restore', 'psql']) {
    if (!commandExists(commandName)) {
      addIssue(issues, strict ? 'error' : 'warning', commandName, `${commandName} is not available on PATH.`);
    }
  }

  if (!canPrepareWritableDir(backupDir)) {
    addIssue(issues, strict ? 'error' : 'warning', 'BACKUP_DIR', 'BACKUP_DIR is not writable or cannot be created.');
  }

  if (!/^\d+$/.test(retentionDays) || Number(retentionDays) < 1) {
    addIssue(issues, 'error', 'RETENTION_DAYS', 'RETENTION_DAYS must be a positive integer.');
  }

  if (has('RESTORE_DATABASE_URL')) {
    if (!restoreDatabaseUrl) {
      addIssue(issues, 'error', 'RESTORE_DATABASE_URL', 'RESTORE_DATABASE_URL must be a PostgreSQL connection string.');
    } else if (databaseUrl && databaseFingerprint(databaseUrl) === databaseFingerprint(restoreDatabaseUrl)) {
      addIssue(issues, 'error', 'RESTORE_DATABASE_URL', 'RESTORE_DATABASE_URL points to the same host/database as DATABASE_URL.');
    }
  } else {
    addIssue(
      issues,
      requireRestore ? 'error' : 'warning',
      'RESTORE_DATABASE_URL',
      'RESTORE_DATABASE_URL is missing; restore verification cannot run.'
    );
  }

  if (backupFile) {
    if (!fs.existsSync(backupFile)) {
      addIssue(issues, 'error', 'BACKUP_FILE', 'BACKUP_FILE does not exist.');
    } else if (!fs.existsSync(`${backupFile}.sha256`)) {
      addIssue(issues, 'warning', 'BACKUP_FILE', 'No .sha256 checksum file found next to BACKUP_FILE.');
    }
  } else if (requireRestore) {
    addIssue(issues, 'error', 'BACKUP_FILE', 'BACKUP_FILE is required for strict restore verification readiness.');
  }

  return {
    strict,
    requireRestore,
    loadedFiles,
    checked: {
      DATABASE_URL: databaseUrl ? 'configured' : 'missing-or-invalid',
      BACKUP_DIR: backupDir,
      RETENTION_DAYS: retentionDays,
      RESTORE_DATABASE_URL: restoreDatabaseUrl ? 'configured' : 'missing-or-invalid',
      BACKUP_FILE: backupFile ? 'configured' : 'missing',
      PLATFORM: `${os.platform()} ${os.release()}`
    },
    issues
  };
}

function main() {
  const summary = validateBackupRestoreReadiness();
  const errors = summary.issues.filter(issue => issue.level === 'error');
  const warnings = summary.issues.filter(issue => issue.level === 'warning');

  console.log('Backup/restore readiness audit');
  console.log(`Mode: ${summary.strict ? 'strict' : 'advisory'}`);
  if (summary.loadedFiles.length > 0) {
    console.log(`Loaded env files: ${summary.loadedFiles.join(', ')}`);
  }
  for (const [key, state] of Object.entries(summary.checked)) {
    console.log(`- ${key}: ${state}`);
  }

  if (summary.issues.length > 0) {
    console.error('\nFindings:');
    for (const issue of summary.issues) {
      console.error(`- [${issue.level}] ${issue.key}: ${issue.message}`);
    }
  }

  if (errors.length > 0) {
    console.error(`\nBackup/restore readiness audit failed with ${errors.length} error(s) and ${warnings.length} warning(s).`);
    process.exit(1);
  }

  console.log(`\nBackup/restore readiness audit passed with ${warnings.length} warning(s).`);
}

if (require.main === module) {
  main();
}

module.exports = {
  databaseFingerprint,
  parseDatabaseUrl,
  validateBackupRestoreReadiness
};
