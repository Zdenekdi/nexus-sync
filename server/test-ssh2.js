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
    const res = await ssh.execCommand('pm2 status && echo "---" && systemctl status postgresql --no-pager');
    console.log(res.stdout);
    if(res.stderr) console.log("STDERR:", res.stderr);
    process.exit(0);
  } catch (err) {
    console.error("Connection failed:", err);
    process.exit(1);
  }
}
run();
