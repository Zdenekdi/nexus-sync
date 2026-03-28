const express = require("express");
const router = express.Router();
const axios = require("axios");
const { NodeSSH } = require("node-ssh");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const logger = require("../services/logger");
const authMiddleware = require("../middleware/authMiddleware");

const VULTR_API = "https://api.vultr.com/v2";
const headers = () => ({
  "Authorization": `Bearer ${process.env.VULTR_API_KEY}`,
  "Content-Type": "application/json",
});

// ── APK Upload (multer) ───────────────────────────────────────────────────────
const DOWNLOADS_DIR = path.join(__dirname, "../../downloads");
if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

const apkStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, DOWNLOADS_DIR),
  filename: (req, file, cb) => cb(null, "nexus-relay.apk")
});
const apkUpload = multer({ 
  storage: apkStorage,
  limits: { fileSize: 150 * 1024 * 1024 } // 150 MB max
});

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

// Apply auth to all vultr routes
router.use(authMiddleware);

// ── Vultr API ─────────────────────────────────────────────────────────────────
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

// ── SSH Terminal ──────────────────────────────────────────────────────────────
router.post("/command", async (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: "Command is required" });

  const blocked = ["rm -rf /", "mkfs", "dd if=", ":(){ :|:& };:"];
  if (blocked.some(b => command.includes(b))) {
    return res.status(403).json({ error: "Command blocked for safety" });
  }

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
  const { path: repoPath = "~/app" } = req.body;
  try {
    const ssh = await getSSHConnection();
    const result = await ssh.execCommand(`cd ${repoPath} && git pull origin master`);
    ssh.dispose();
    res.json({ stdout: result.stdout || "Already up to date.", stderr: result.stderr });
  } catch (err) {
    logger.error("SSH Git Pull Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── APK Management ────────────────────────────────────────────────────────────
router.post("/upload-apk", apkUpload.single("apk"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No APK file provided" });
  const stat = fs.statSync(req.file.path);
  const version = req.body.version || "1.0";
  const meta = {
    version,
    filename: "nexus-relay.apk",
    size: stat.size,
    uploadedAt: new Date().toISOString(),
    downloadUrl: `${process.env.API_BASE_URL || "https://nexus-api.myvnc.com"}/downloads/nexus-relay.apk`
  };
  fs.writeFileSync(path.join(DOWNLOADS_DIR, "nexus-relay.meta.json"), JSON.stringify(meta, null, 2));
  logger.info(`[APK] New relay APK v${version} uploaded: ${stat.size} bytes`);
  res.json({ ok: true, ...meta });
});

router.get("/apk-info", (req, res) => {
  const apkPath = path.join(DOWNLOADS_DIR, "nexus-relay.apk");
  const metaPath = path.join(DOWNLOADS_DIR, "nexus-relay.meta.json");
  if (!fs.existsSync(apkPath)) {
    return res.json({ available: false });
  }
  const stat = fs.statSync(apkPath);
  let meta = {};
  if (fs.existsSync(metaPath)) {
    try { meta = JSON.parse(fs.readFileSync(metaPath, "utf8")); } catch {}
  }
  res.json({
    available: true,
    filename: "nexus-relay.apk",
    version: meta.version || "1.0",
    size: stat.size,
    uploadedAt: meta.uploadedAt || stat.mtime.toISOString(),
    downloadUrl: meta.downloadUrl || `${process.env.API_BASE_URL || "https://nexus-api.myvnc.com"}/downloads/nexus-relay.apk`
  });
});

module.exports = router;
