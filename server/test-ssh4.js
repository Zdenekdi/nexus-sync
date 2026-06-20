const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
  try {
    await ssh.connect({ host: '78.141.202.139', username: 'root', password: 'a3P!?Usa#v2e6Vf,' });
    const res = await ssh.execCommand('pm2 info nexus-backend-final | grep "script path"');
    console.log(res.stdout);
    process.exit(0);
  } catch (err) { console.error(err); process.exit(1); }
}
run();
