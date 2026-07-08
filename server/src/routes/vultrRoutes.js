const express = require("express");
const router = express.Router();
const axios = require("axios");
const { NodeSSH } = require("node-ssh");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const logger = require("../services/logger");
const authMiddleware = require("../middleware/authMiddleware");
const { requireAppOwner } = require("../utils/authz");
const { z } = require("zod");
const { validate } = require("../middleware/validate");
const ApkReader = require("adbkit-apkreader");

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

async function readApkManifestMetadata(apkPath, stat) {
  if (!stat || stat.size >= 100 * 1024 * 1024) return null;

  try {
    const reader = await ApkReader.open(apkPath);
    const manifest = await reader.readManifest();
    return {
      version: manifest.versionName || null,
      versionCode: manifest.versionCode || 0,
      packageName: manifest.package || ""
    };
  } catch (err) {
    logger.warn("[APK] Failed to parse APK metadata:", err.message);
    return null;
  }
}

const apkStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, DOWNLOADS_DIR),
  filename: (req, file, cb) => {
    const type = req.body.type;
    let isFull = false;
    if (type === 'full') {
      isFull = true;
    } else if (type === 'relay') {
      isFull = false;
    } else {
      // Fallback
      isFull = file.originalname && file.originalname.includes('full');
    }
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
  const type = req.query.type === 'full' ? 'full' : 'relay';
  const apkFileName = type === 'full' ? "nexus-full-latest.apk" : "nexus-relay-latest.apk";
  const metaFileName = type === 'full' ? "nexus-full.meta.json" : "nexus-relay.meta.json";
  
  const apkPath = path.join(DOWNLOADS_DIR, apkFileName);
  const metaPath = path.join(DOWNLOADS_DIR, metaFileName);
  
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

  if (!meta.version || meta.version === "1.0" || !meta.versionCode) {
    const parsedMeta = await readApkManifestMetadata(apkPath, stat);
    if (parsedMeta?.version) {
      meta = { ...meta, ...parsedMeta, filename: apkFileName, size: stat.size, uploadedAt: meta.uploadedAt || stat.mtime.toISOString() };
      try {
        await fs.promises.writeFile(metaPath, JSON.stringify(meta, null, 2));
      } catch (err) {
        logger.warn("[APK] Failed to refresh APK metadata file:", err.message);
      }
    }
  }
  
  res.json({
    available: true,
    filename: apkFileName,
    version: meta.version || null,
    versionCode: meta.versionCode || 0,
    packageName: meta.packageName || "",
    size: meta.size || stat.size,
    uploadedAt: meta.uploadedAt || stat.mtime.toISOString(),
    downloadUrl: `${process.env.API_BASE_URL || "https://nexus-api.myvnc.com"}/api/vultr/download-${type}.apk`
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

// Infrastructure operations can read secrets or control servers; keep them owner-only.
router.use(requireAppOwner);

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
  /^(ls|head|tail|grep|wc|df|du|free|uptime|whoami|date|pwd)(\s|$)/,
  /^pm2\s+(list|status|logs)(\s|$)/,
  /^systemctl\s+status(\s|$)/,
  /^nginx\s+-t(\s|$)/,
  /^git\s+status(\s|$)/,
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
    return res.status(403).json({ message: 'Command not in allowlist. Allowed: read-only status commands only.' });
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

router.post("/upload-apk", apkUpload.single("apk"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No APK file provided' });
  
  try {
    const stat = fs.statSync(req.file.path);
    let version = "1.0";
    let versionCode = 0;
    let packageName = "";
    
    const baseName = req.file.filename; // nexus-full-latest.apk or nexus-relay.apk
    const isFull = baseName.includes('full');

    // Prevent OOM by skipping ApkReader for large files (> 100MB)
    const parsedMeta = await readApkManifestMetadata(req.file.path, stat);
    if (parsedMeta?.version) {
      version = parsedMeta.version;
      versionCode = parsedMeta.versionCode;
      packageName = parsedMeta.packageName;
      logger.info(`[APK] Parsed metadata: ${packageName} v${version} (${versionCode})`);
    } else {
      logger.info(`[APK] Using fallback metadata for ${req.file.filename} (${stat.size} bytes)`);
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
