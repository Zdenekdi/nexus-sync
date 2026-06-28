const express = require("express");
const router = express.Router();
const axios = require("axios");
const { NodeSSH } = require("node-ssh");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const logger = require("../services/logger");
const authMiddleware = require("../middleware/authMiddleware");
const { z } = require("zod");
const { validate } = require("../middleware/validate");

const sshCommand = z.object({
  command: z.string().min(1).max(2000)
});

const gitPull = z.object({
  path: z.string().max(256).optional().default("~/app")
});

const VULTR_API = "https://api.vultr.com/v2";
const headers = () => ({
  "Authorization": `Bearer ${process.env.VULTR_API_KEY}`,
  "Content-Type": "application/json",
});

// ── APK Upload (multer) ───────────────────────────────────────────────────────
const DOWNLOADS_DIR = path.join(__dirname, "../../public/downloads");
if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

const apkStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, DOWNLOADS_DIR),
  filename: (req, file, cb) => {
    const isFull = file.originalname && file.originalname.includes('full');
    cb(null, isFull ? "nexus-full-latest.apk" : "nexus-relay-latest.apk");
  }
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

// -- Public APK download routes --
router.get("/apk-info", async (req, res) => {
  const apkPath = path.join(DOWNLOADS_DIR, "nexus-relay-latest.apk");
  const metaPath = path.join(DOWNLOADS_DIR, "nexus-relay.meta.json");
  if (!fs.existsSync(apkPath)) {
    return res.json({ available: false });
  }
  const stat = await fs.promises.stat(apkPath);
  let meta = {};
  if (fs.existsSync(metaPath)) {
    try {
      const fileContent = await fs.promises.readFile(metaPath, "utf8");
      meta = JSON.parse(fileContent);
    } catch {}
  }
  res.json({
    available: true,
    filename: "nexus-relay-latest.apk",
    version: meta.version || "1.0",
    size: stat.size,
    uploadedAt: meta.uploadedAt || stat.mtime.toISOString(),
    downloadUrl: `${process.env.API_BASE_URL || "https://nexus-api.myvnc.com"}/api/vultr/download-relay.apk`
  });
});

router.get("/download-relay.apk", (req, res) => {
  const apkPath = path.join(DOWNLOADS_DIR, "nexus-relay-latest.apk");
  if (fs.existsSync(apkPath)) {
    res.download(apkPath, "nexus-relay-latest.apk");
  } else {
    res.status(404).send("APK not found");
  }
});

router.get("/download-full.apk", (req, res) => {
  const apkPath = path.join(DOWNLOADS_DIR, "nexus-full-latest.apk");
  if (fs.existsSync(apkPath)) {
    res.download(apkPath, "nexus-full-latest.apk");
  } else {
    res.status(404).send("APK not found");
  }
});

// Apply auth to all OTHER vultr routes
router.use(authMiddleware);

// Restrict all vultr operations to App Owner / Agency Admin
const requireAdmin = (req, res, next) => {
  const role = req.user?.role;
  if (!role?.isAppOwner && !role?.isManager) {
    return res.status(403).json({ message: 'Insufficient permissions — admin access required' });
  }
  next();
};
router.use(requireAdmin);

// ── Vultr API ─────────────────────────────────────────────────────────────────
router.get("/status", async (req, res) => {
  try {
    const { data } = await axios.get(`${VULTR_API}/instances/${process.env.VULTR_INSTANCE_ID}`, { headers: headers() });
    res.json(data.instance);
  } catch (err) {
    logger.error("Vultr Status Error:", err.message);
    res.status(err.response?.status || 500).json({ message: 'Failed to fetch server status' });
  }
});

router.post("/start", async (req, res) => {
  try {
    await axios.post(`${VULTR_API}/instances/${process.env.VULTR_INSTANCE_ID}/start`, {}, { headers: headers() });
    res.json({ ok: true });
  } catch (err) {
    logger.error("Vultr Start Error:", err.message);
    res.status(500).json({ message: 'Failed to start server' });
  }
});

router.post("/stop", async (req, res) => {
  try {
    await axios.post(`${VULTR_API}/instances/${process.env.VULTR_INSTANCE_ID}/halt`, {}, { headers: headers() });
    res.json({ ok: true });
  } catch (err) {
    logger.error("Vultr Stop Error:", err.message);
    res.status(500).json({ message: 'Failed to stop server' });
  }
});

router.post("/restart", async (req, res) => {
  try {
    await axios.post(`${VULTR_API}/instances/${process.env.VULTR_INSTANCE_ID}/reboot`, {}, { headers: headers() });
    res.json({ ok: true });
  } catch (err) {
    logger.error("Vultr Restart Error:", err.message);
    res.status(500).json({ message: 'Failed to restart server' });
  }
});

router.get("/bandwidth", async (req, res) => {
  try {
    const { data } = await axios.get(`${VULTR_API}/instances/${process.env.VULTR_INSTANCE_ID}/bandwidth`, { headers: headers() });
    res.json(data.bandwidth);
  } catch (err) {
    logger.error("Vultr Bandwidth Error:", err.message);
    res.status(err.response?.status || 500).json({ message: 'Failed to fetch bandwidth data' });
  }
});

// ── SSH Terminal ──────────────────────────────────────────────────────────────
const COMMAND_ALLOWLIST = [
  /^(ls|cat|head|tail|grep|wc|df|du|free|uptime|whoami|date|pwd|echo|pm2\s|systemctl\s|docker\s|nginx\s|git\s|npm\s|node\s|npx\s|pg_dump|psql|crontab)/,
];
const COMMAND_BLOCKLIST = /rm\s+-rf|mkfs|dd\s+if=|:\(\)\{|>\s*\/dev\/|chmod\s+777|curl\s+.*\|\s*(ba)?sh|wget\s+.*\|\s*(ba)?sh|eval\s|exec\s|[;|&$\n`<>\\]/i;

router.post("/command", validate(sshCommand), async (req, res) => {
  const { command } = req.body;
  const trimmed = command.trim();

  if (COMMAND_BLOCKLIST.test(trimmed)) {
    return res.status(403).json({ message: 'This command is not allowed for security reasons' });
  }

  const isAllowed = COMMAND_ALLOWLIST.some(rx => rx.test(trimmed));
  if (!isAllowed) {
    return res.status(403).json({ message: 'Command not in allowlist. Allowed: ls, cat, head, tail, grep, pm2, systemctl, docker, git, npm, node, pg_dump, psql' });
  }

  try {
    const ssh = await getSSHConnection();
    const result = await ssh.execCommand(command);
    ssh.dispose();
    res.json({ stdout: result.stdout, stderr: result.stderr });
  } catch (err) {
    logger.error("SSH Command Error:", err.message);
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
    logger.error("SSH Git Pull Error:", err.message);
    res.status(500).json({ message: 'Git pull failed' });
  }
});

// ── APK Management ────────────────────────────────────────────────────────────
const ApkReader = require("adbkit-apkreader");

router.post("/upload-apk", apkUpload.single("apk"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No APK file provided' });
  
  try {
    const stat = fs.statSync(req.file.path);
    let version = "1.0";
    let versionCode = 0;
    let packageName = "";
    
    const baseName = req.file.filename; // nexus-full-latest.apk or nexus-relay.apk
    const isFull = baseName.includes('full');

    // Prevent OOM by skipping ApkReader for large files (> 30MB)
    if (stat.size < 30 * 1024 * 1024) {
      try {
        const reader = await ApkReader.open(req.file.path);
        const manifest = await reader.readManifest();
        version = manifest.versionName || "1.0";
        versionCode = manifest.versionCode || 0;
        packageName = manifest.package || "";
        logger.info(`[APK] Parsed metadata: ${packageName} v${version} (${versionCode})`);
      } catch (parseErr) {
        logger.warn("[APK] Failed to parse APK metadata, using defaults:", parseErr.message);
      }
    } else {
      logger.info(`[APK] Skipping parsing for large file: ${stat.size} bytes`);
    }

    const meta = {
      version,
      versionCode,
      packageName,
      filename: baseName,
      size: stat.size,
      uploadedAt: new Date().toISOString(),
      downloadUrl: `${process.env.API_BASE_URL || "https://nexus-api.myvnc.com"}/api/vultr/download-relay.apk`
    };

    const metaFile = isFull ? "nexus-full.meta.json" : "nexus-relay.meta.json";
    fs.writeFileSync(path.join(DOWNLOADS_DIR, metaFile), JSON.stringify(meta, null, 2));
    logger.info(`[APK] New APK uploaded (${baseName}): ${stat.size} bytes`);
    res.json({ ok: true, ...meta });
  } catch (err) {
    logger.error("[APK] Upload processing error:", err.message);
    res.status(500).json({ message: "Failed to process APK upload" });
  }
});

router.get("/latest-version", async (req, res) => {
  const metaPath = path.join(DOWNLOADS_DIR, "nexus-relay.meta.json");
  if (!fs.existsSync(metaPath)) {
    return res.status(404).json({ message: "No version info available" });
  }
  try {
    const fileContent = await fs.promises.readFile(metaPath, "utf8");
    const meta = JSON.parse(fileContent);
    res.json(meta);
  } catch (err) {
    res.status(500).json({ message: "Error reading version info" });
  }
});

const otaUpload = multer({ 
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, DOWNLOADS_DIR),
    filename: (req, file, cb) => cb(null, "nexus-relay.zip")
  }),
  limits: { fileSize: 100 * 1024 * 1024 }
});

router.post("/upload-ota", otaUpload.single("ota"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No OTA file provided' });
  const version = req.body.version || "1.0";
  const metaPath = path.join(DOWNLOADS_DIR, "nexus-relay.meta.json");
  
  let meta = {};
  if (fs.existsSync(metaPath)) {
    try {
      const fileContent = await fs.promises.readFile(metaPath, "utf8");
      meta = JSON.parse(fileContent);
    } catch {}
  }

  meta.version = version;
  meta.uploadedAt = new Date().toISOString();
  meta.otaUrl = `${process.env.API_BASE_URL || "https://nexus-api.myvnc.com"}/downloads/nexus-relay.zip`;

  await fs.promises.writeFile(metaPath, JSON.stringify(meta, null, 2));
  logger.info(`[OTA] New web bundle v${version} uploaded`);
  res.json({ ok: true, version });
});

module.exports = router;
