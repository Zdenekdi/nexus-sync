const express = require("express");
const router = express.Router();
const axios = require("axios");
const { NodeSSH } = require("node-ssh");
const logger = require("../services/logger");
const authMiddleware = require("../middleware/authMiddleware");

const VULTR_API = "https://api.vultr.com/v2";
const headers = () => ({
  Authorization: `Bearer ${process.env.VULTR_API_KEY}`,
  "Content-Type": "application/json",
});

// Apply auth to all vultr routes
router.use(authMiddleware);

// Helper for SSH connection
async function getSSHConnection() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: process.env.SSH_HOST,
    username: process.env.SSH_USER,
    privateKeyPath: process.env.SSH_KEY_PATH,
  });
  return ssh;
}

// --- Vultr API ---
router.get("/status", async (req, res) => {
  try {
    const { data } = await axios.get(`${VULTR_API}/instances/${process.env.VULTR_INSTANCE_ID}`, { headers: headers() });
    res.json(data.instance);
  } catch (err) {
    logger.error("Vultr Status Error:", err.message);
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

router.post("/start", async (req, res) => {
  try {
    await axios.post(`${VULTR_API}/instances/${process.env.VULTR_INSTANCE_ID}/start`, {}, { headers: headers() });
    res.json({ ok: true });
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

router.post("/stop", async (req, res) => {
  try {
    await axios.post(`${VULTR_API}/instances/${process.env.VULTR_INSTANCE_ID}/halt`, {}, { headers: headers() });
    res.json({ ok: true });
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

router.post("/restart", async (req, res) => {
  try {
    await axios.post(`${VULTR_API}/instances/${process.env.VULTR_INSTANCE_ID}/reboot`, {}, { headers: headers() });
    res.json({ ok: true });
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

router.get("/bandwidth", async (req, res) => {
  try {
    const { data } = await axios.get(`${VULTR_API}/instances/${process.env.VULTR_INSTANCE_ID}/bandwidth`, { headers: headers() });
    res.json(data.bandwidth);
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

// --- SSH commands ---
router.post("/command", async (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: "Command is required" });
  
  try {
    const ssh = await getSSHConnection();
    const result = await ssh.execCommand(command);
    ssh.dispose();
    res.json({ stdout: result.stdout, stderr: result.stderr });
  } catch (err) {
    logger.error("SSH Command Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/git-pull", async (req, res) => {
  const { path = "~/app" } = req.body;
  try {
    const ssh = await getSSHConnection();
    const result = await ssh.execCommand(`cd ${path} && git pull`);
    ssh.dispose();
    res.json({ stdout: result.stdout, stderr: result.stderr });
  } catch (err) {
    logger.error("SSH Git Pull Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
