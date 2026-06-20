const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
  try {
    await ssh.connect({ host: '78.141.202.139', username: 'root', password: 'a3P!?Usa#v2e6Vf,' });
    const res = await ssh.execCommand('cd /root/nexus-backend && git fetch origin && git reset --hard origin/master && npm install && npx prisma migrate deploy && pm2 restart nexus-backend-final');
    console.log(res.stdout);
    if (res.stderr) console.error("STDERR:", res.stderr);
    process.exit(0);
  } catch (err) { console.error(err); process.exit(1); }
}
run();
