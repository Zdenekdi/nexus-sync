const express = require("express");
const router = express.Router();
const axios = require("axios");
const logger = require("../services/logger");
const authMiddleware = require("../middleware/authMiddleware");
const { NodeSSH } = require("node-ssh");
const { z } = require("zod");
const { validate } = require("../middleware/validate");

const HETZNER_API = "https://api.hetzner.cloud/v1";

const headers = () => ({
  "Authorization": `Bearer ${process.env.HETZNER_API_KEY}`,
  "Content-Type": "application/json",
});

const sshCommand = z.object({
  command: z.string().min(1).max(2000)
});

const gitPull = z.object({
  path: z.string().max(256).optional().default("~/app")
});

// Helper for SSH connection to Hetzner AI Node
async function getSSHConnection() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: process.env.HETZNER_SSH_HOST,
    username: process.env.SSH_USER || 'root',
    privateKeyPath: process.env.SSH_KEY_PATH,
  });
  return ssh;
}

// Apply auth and admin check
router.use(authMiddleware);
const requireAdmin = (req, res, next) => {
  const role = req.user?.role;
  if (!role?.isAppOwner && !role?.isManager) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  next();
};
router.use(requireAdmin);

// ── Hetzner API ───────────────────────────────────────────────────────────────

router.get("/status", async (req, res) => {
  try {
    const serverId = process.env.HETZNER_SERVER_ID || "128335266";
    const { data } = await axios.get(`${HETZNER_API}/servers/${serverId}`, { headers: headers() });
    
    // Map Hetzner status to our common format
    const server = data.server;
    res.json({
      id: server.id,
      name: server.name,
      status: server.status,
      power_status: server.status === 'running' ? 'running' : 'stopped',
      main_ip: server.public_net?.ipv4?.ip || '---',
      os: server.image?.description || 'Ubuntu',
      region: server.datacenter?.location?.city || 'Nuremberg',
      vcpu_count: server.server_type?.cores || 0,
      ram: server.server_type?.memory || 0,
      server_type: server.server_type?.name || 'cx11'
    });
  } catch (err) {
    const status = err.response?.status || 500;
    const errorData = err.response?.data || err.message;
    logger.error(`Hetzner Status Error [${status}]:`, JSON.stringify(errorData));
    res.status(status).json({ 
      error: 'Failed to fetch Hetzner status',
      details: typeof errorData === 'object' ? errorData : { message: errorData }
    });
  }
});

router.post("/start", async (req, res) => {
  try {
    const serverId = process.env.HETZNER_SERVER_ID || "128335266";
    await axios.post(`${HETZNER_API}/servers/${serverId}/actions/poweron`, {}, { headers: headers() });
    res.json({ ok: true });
  } catch (err) {
    logger.error("Hetzner Start Error:", err.message);
    res.status(500).json({ message: 'Failed to start server' });
  }
});

router.post("/stop", async (req, res) => {
  try {
    const serverId = process.env.HETZNER_SERVER_ID || "128335266";
    // Using shutdown (soft) or poweroff (hard)
    await axios.post(`${HETZNER_API}/servers/${serverId}/actions/shutdown`, {}, { headers: headers() });
    res.json({ ok: true });
  } catch (err) {
    logger.error("Hetzner Stop Error:", err.message);
    res.status(500).json({ message: 'Failed to stop server' });
  }
});

router.post("/restart", async (req, res) => {
  try {
    const serverId = process.env.HETZNER_SERVER_ID || "128335266";
    await axios.post(`${HETZNER_API}/servers/${serverId}/actions/reboot`, {}, { headers: headers() });
    res.json({ ok: true });
  } catch (err) {
    logger.error("Hetzner Restart Error:", err.message);
    res.status(500).json({ message: 'Failed to restart server' });
  }
});

// ── SSH Terminal for Hetzner ──────────────────────────────────────────────────
const COMMAND_ALLOWLIST = [
  /^(ls|cat|head|tail|grep|wc|df|du|free|uptime|whoami|date|pwd|echo|pm2\s|systemctl\s|docker\s|nginx\s|git\s|npm\s|node\s|npx\s|pg_dump|psql|crontab)/,
];
const COMMAND_BLOCKLIST = /rm\s+-rf|mkfs|dd\s+if=|:\(\)\{|>\s*\/dev\/|chmod\s+777|curl\s+.*\|\s*(ba)?sh|wget\s+.*\|\s*(ba)?sh|eval\s|exec\s/i;

router.post("/command", validate(sshCommand), async (req, res) => {
  const { command } = req.body;
  const trimmed = command.trim();

  if (COMMAND_BLOCKLIST.test(trimmed)) {
    return res.status(403).json({ message: 'This command is not allowed for security reasons' });
  }

  const isAllowed = COMMAND_ALLOWLIST.some(rx => rx.test(trimmed));
  if (!isAllowed) {
    return res.status(403).json({ message: 'Command not in allowlist' });
  }

  try {
    const ssh = await getSSHConnection();
    const result = await ssh.execCommand(command);
    ssh.dispose();
    res.json({ stdout: result.stdout, stderr: result.stderr });
  } catch (err) {
    logger.error("Hetzner SSH Command Error:", err.message);
    res.status(500).json({ message: 'Command execution failed' });
  }
});

router.post("/git-pull", validate(gitPull), async (req, res) => {
  const { path: repoPath } = req.body;

  // Prevent path traversal and command injection
  if (/[$;|&\n`]|\.\./.test(repoPath)) {
    return res.status(403).json({ message: 'Invalid path — traversal and command injection not allowed' });
  }

  try {
    const ssh = await getSSHConnection();
    const result = await ssh.execCommand(`cd ${repoPath} && git pull origin master`);
    ssh.dispose();
    res.json({ stdout: result.stdout || "Already up to date.", stderr: result.stderr });
  } catch (err) {
    logger.error("Hetzner SSH Git Pull Error:", err.message);
    res.status(500).json({ message: 'Git pull failed' });
  }
});

router.get("/metrics", async (req, res) => {
  try {
    const serverId = process.env.HETZNER_SERVER_ID || "128335266";
    // Fetch metrics for last 30 minutes
    const end = new Date().toISOString();
    const start = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data } = await axios.get(`${HETZNER_API}/servers/${serverId}/metrics`, {
      params: {
        type: 'cpu,network',
        start,
        end
      },
      headers: headers()
    });
    
    // Calculate simple bandwidth average from metrics
    const netIn = data.metrics?.time_series?.network_0_in?.values || [];
    const netOut = data.metrics?.time_series?.network_0_out?.values || [];
    
    const lastIn = netIn.length > 0 ? parseFloat(netIn[netIn.length - 1][1]) : 0;
    const lastOut = netOut.length > 0 ? parseFloat(netOut[netOut.length - 1][1]) : 0;
    
    res.json({
      incoming_bytes: lastIn,
      outgoing_bytes: lastOut,
      cpu_load: data.metrics?.time_series?.cpu?.values?.slice(-1)[0]?.[1] || 0
    });
  } catch (err) {
    logger.warn("Hetzner Metrics Error:", err.message);
    res.status(500).json({ message: 'Failed to fetch metrics' });
  }
});

module.exports = router;
