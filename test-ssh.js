const { NodeSSH } = require('node-ssh');
const { buildSshConfig } = require('./server/scripts/ssh-env');
const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect(buildSshConfig());
    console.log("Connected successfully!");
    const res = await ssh.execCommand('pm2 status && echo "---" && docker ps -a 2>/dev/null || echo "No docker"');
    console.log(res.stdout);
    if(res.stderr) console.log("STDERR:", res.stderr);
    process.exit(0);
  } catch (err) {
    console.error("Connection failed:", err);
    process.exit(1);
  }
}
run();
