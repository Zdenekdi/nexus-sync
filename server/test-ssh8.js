const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
  try {
    await ssh.connect({ host: '78.141.202.139', username: 'root', password: 'a3P!?Usa#v2e6Vf,' });
    const res = await ssh.execCommand('cd /root/nexus-backend && git remote -v && git status');
    console.log(res.stdout);
    process.exit(0);
  } catch (err) { console.error(err); process.exit(1); }
}
run();
