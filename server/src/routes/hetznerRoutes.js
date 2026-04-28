const express = require("express");
const router = express.Router();
const axios = require("axios");
const logger = require("../services/logger");
const authMiddleware = require("../middleware/authMiddleware");

const HETZNER_API = "https://api.hetzner.cloud/v1";

const headers = () => ({
  "Authorization": `Bearer ${process.env.HETZNER_API_KEY}`,
  "Content-Type": "application/json",
});

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
    });
  } catch (err) {
    logger.error(`Hetzner Status Error: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch Hetzner status' });
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

module.exports = router;
