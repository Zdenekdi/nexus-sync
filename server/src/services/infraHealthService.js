const os = require('os');
const fs = require('fs');
const { execFile } = require('child_process');
const axios = require('axios');
const { NodeSSH } = require('node-ssh');
const prisma = require('./db');
const aiService = require('./aiService');
const logger = require('./logger');

const isTruthyEnv = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const isLocalAiEndpoint = (baseUrl = '') => /^https?:\/\/(localhost|127\.0\.0\.1|\[?::1\]?)(:|\/|$)/i.test(baseUrl);

const execFileAsync = (file, args, options = {}) => new Promise((resolve) => {
  execFile(file, args, { timeout: 8000, ...options }, (error, stdout, stderr) => {
    resolve({ error, stdout, stderr });
  });
});

const compactError = (error) => {
  if (!error) return null;
  if (error.response?.data?.error?.message) return error.response.data.error.message;
  if (error.response?.data?.message) return error.response.data.message;
  return error.message || String(error);
};

const getProcess = (processes, name) => {
  const process = processes.find((item) => item.name === name);
  if (!process) return { name, status: 'missing', ok: false };

  return {
    name,
    status: process.pm2_env?.status || 'unknown',
    ok: process.pm2_env?.status === 'online',
    pid: process.pid,
    restarts: process.pm2_env?.restart_time || 0,
    uptimeMs: process.pm2_env?.pm_uptime ? Date.now() - process.pm2_env.pm_uptime : null,
    memoryMb: process.monit?.memory ? Math.round(process.monit.memory / 1024 / 1024) : null,
    cpu: process.monit?.cpu ?? null
  };
};

class InfraHealthService {
  async getPm2Health() {
    const result = await execFileAsync('pm2', ['jlist']);
    if (result.error) {
      return {
        ok: false,
        error: result.stderr || result.error.message,
        processes: {
          backend: { name: 'nexus-backend-final', status: 'unknown', ok: false },
          aiTunnel: { name: 'ai-tunnel', status: 'unknown', ok: false }
        }
      };
    }

    try {
      const list = JSON.parse(result.stdout || '[]');
      const backend = getProcess(list, process.env.PM2_BACKEND_NAME || 'nexus-backend-final');
      const tunnelName = process.env.PM2_AI_TUNNEL_NAME || 'ai-tunnel';
      const aiConfig = aiService.getConfig();
      const tunnelRequired = isTruthyEnv(process.env.AI_TUNNEL_REQUIRED, isLocalAiEndpoint(aiConfig.baseUrl));
      const aiTunnel = tunnelRequired
        ? getProcess(list, tunnelName)
        : { name: tunnelName, status: 'not_required', ok: true };
      return {
        ok: backend.ok && aiTunnel.ok,
        processes: { backend, aiTunnel }
      };
    } catch (error) {
      return {
        ok: false,
        error: `Failed to parse PM2 output: ${error.message}`,
        processes: {}
      };
    }
  }

  async getDatabaseHealth() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { ok: true, status: 'connected' };
    } catch (error) {
      return { ok: false, status: 'disconnected', error: error.message };
    }
  }

  async getDiskHealth() {
    const result = await execFileAsync('df', ['-k', '/']);
    if (result.error) return { ok: false, error: result.stderr || result.error.message };

    const line = result.stdout.trim().split('\n')[1];
    const parts = line ? line.trim().split(/\s+/) : [];
    if (parts.length < 5) return { ok: false, error: 'Unexpected df output' };

    return {
      ok: true,
      totalGb: Number((Number(parts[1]) / 1024 / 1024).toFixed(1)),
      usedGb: Number((Number(parts[2]) / 1024 / 1024).toFixed(1)),
      availableGb: Number((Number(parts[3]) / 1024 / 1024).toFixed(1)),
      percent: parts[4]
    };
  }

  async getProviderHealth() {
    const checks = {
      vultr: { ok: false, configured: Boolean(process.env.VULTR_API_KEY && process.env.VULTR_INSTANCE_ID) },
      hetzner: { ok: false, configured: Boolean(process.env.HETZNER_API_KEY && process.env.HETZNER_SERVER_ID) }
    };

    if (checks.vultr.configured) {
      try {
        const { data } = await axios.get(`https://api.vultr.com/v2/instances/${process.env.VULTR_INSTANCE_ID}`, {
          timeout: 10000,
          headers: { Authorization: `Bearer ${process.env.VULTR_API_KEY}` }
        });
        checks.vultr = {
          ok: data.instance?.power_status === 'running',
          configured: true,
          name: data.instance?.label || data.instance?.hostname || 'Vultr',
          status: data.instance?.power_status,
          ip: data.instance?.main_ip,
          region: data.instance?.region,
          vcpuCount: data.instance?.vcpu_count,
          ramMb: data.instance?.ram,
          diskGb: data.instance?.disk
        };
      } catch (error) {
        checks.vultr.error = compactError(error);
      }
    }

    if (checks.hetzner.configured) {
      try {
        const { data } = await axios.get(`https://api.hetzner.cloud/v1/servers/${process.env.HETZNER_SERVER_ID}`, {
          timeout: 10000,
          headers: { Authorization: `Bearer ${process.env.HETZNER_API_KEY}` }
        });
        checks.hetzner = {
          ok: data.server?.status === 'running',
          configured: true,
          name: data.server?.name || 'Hetzner AI Node',
          status: data.server?.status,
          ip: data.server?.public_net?.ipv4?.ip,
          region: data.server?.datacenter?.location?.city,
          serverType: data.server?.server_type?.name,
          vcpuCount: data.server?.server_type?.cores,
          ramGb: data.server?.server_type?.memory,
          diskGb: data.server?.server_type?.disk
        };
      } catch (error) {
        checks.hetzner.error = compactError(error);
      }
    }

    return checks;
  }

  async checkSshTarget(name, host, username) {
    if (!host) return { ok: false, host: null, error: 'Host is not configured' };

    const keyPath = process.env.SSH_KEY_PATH;
    if (!keyPath || !fs.existsSync(keyPath)) {
      return { ok: false, host, error: `SSH key is missing at ${keyPath || '(empty)'}` };
    }

    try {
      const ssh = new NodeSSH();
      await ssh.connect({
        host,
        username,
        privateKeyPath: keyPath,
        readyTimeout: 8000
      });
      const result = await ssh.execCommand('hostname');
      ssh.dispose();
      return {
        ok: !result.stderr,
        host,
        username,
        hostname: result.stdout.trim(),
        error: result.stderr || null
      };
    } catch (error) {
      logger.warn(`[InfraHealth] SSH check failed for ${name}: ${error.message}`);
      return { ok: false, host, error: error.message };
    }
  }

  async getSshHealth() {
    const [vultr, hetzner] = await Promise.all([
      this.checkSshTarget('vultr', process.env.SSH_HOST, process.env.SSH_USER || 'root'),
      this.checkSshTarget('hetzner', process.env.HETZNER_SSH_HOST, process.env.HETZNER_SSH_USER || process.env.SSH_USER || 'root')
    ]);

    return {
      ok: vultr.ok && hetzner.ok,
      targets: { vultr, hetzner }
    };
  }

  async summarize() {
    const memoryTotal = os.totalmem();
    const memoryFree = os.freemem();
    const [database, disk, pm2, ai, providers, ssh] = await Promise.all([
      this.getDatabaseHealth(),
      this.getDiskHealth(),
      this.getPm2Health(),
      aiService.healthCheck({ includeInternal: true }),
      this.getProviderHealth(),
      this.getSshHealth()
    ]);

    const checks = {
      api: {
        ok: true,
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
        hostUptimeSeconds: Math.floor(os.uptime()),
        cpu: {
          cores: os.cpus().length,
          model: os.cpus()[0]?.model || 'CPU'
        },
        memory: {
          totalGb: Number((memoryTotal / 1024 / 1024 / 1024).toFixed(2)),
          usedGb: Number(((memoryTotal - memoryFree) / 1024 / 1024 / 1024).toFixed(2)),
          percent: Number((((memoryTotal - memoryFree) / memoryTotal) * 100).toFixed(1))
        },
        loadAvg: os.loadavg().map((item) => Number(item.toFixed(2)))
      },
      database,
      disk,
      pm2,
      ai,
      providers,
      ssh
    };

    const issues = [];
    if (!database.ok) issues.push({ check: 'database', message: database.error || database.status });
    if (!disk.ok) issues.push({ check: 'disk', message: disk.error || 'Disk check failed' });
    if (!pm2.ok) issues.push({ check: 'pm2', message: pm2.error || 'One or more PM2 processes are not online' });
    if (!ai.ok) issues.push({ check: 'ai', message: ai.error || 'AI/Ollama is not reachable' });
    if (!providers.vultr.ok) issues.push({ check: 'vultr', message: providers.vultr.error || providers.vultr.status || 'Vultr is not running' });
    if (!providers.hetzner.ok) issues.push({ check: 'hetzner', message: providers.hetzner.error || providers.hetzner.status || 'Hetzner is not running' });
    if (!ssh.ok) issues.push({ check: 'ssh', message: 'One or more SSH targets are not reachable from the backend' });

    return {
      status: issues.length === 0 ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
      issues
    };
  }
}

module.exports = new InfraHealthService();
