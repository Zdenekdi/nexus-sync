const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect({
      host: '78.141.202.139',
      username: 'root',
      password: 'a3P!?Usa#v2e6Vf,'
    });
    console.log("Connected successfully!");

    // Upload schemas.js
    await ssh.putFile(
      '/Users/zdenekdias/.gemini/antigravity/scratch/nexus-hub/server/src/middleware/schemas.js',
      '/root/nexus-backend/src/middleware/schemas.js'
    );
    console.log("Uploaded schemas.js");

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
