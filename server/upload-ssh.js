const { NodeSSH } = require('node-ssh');
const path = require('path');
const { buildSshConfig } = require('./scripts/ssh-env');
const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect(buildSshConfig());
    console.log("Connected successfully!");

    const localFile = process.env.LOCAL_UPLOAD_FILE || path.join(__dirname, 'src/middleware/schemas.js');
    const remoteFile = process.env.REMOTE_UPLOAD_FILE || '/root/nexus-backend/src/middleware/schemas.js';

    await ssh.putFile(
      localFile,
      remoteFile
    );
    console.log(`Uploaded ${localFile} to ${remoteFile}`);

    // Restart PM2 to apply changes
    const res = await ssh.execCommand('pm2 restart nexus-backend-final');
    console.log("Restarted PM2:", res.stdout);

    process.exit(0);
  } catch (err) {
    console.error("Failed:", err);
    process.exit(1);
  }
}
run();
