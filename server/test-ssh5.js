const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
  try {
    await ssh.connect({ host: '78.141.202.139', username: 'root', password: 'a3P!?Usa#v2e6Vf,' });
    await ssh.execCommand('echo "ENCRYPTION_KEY=Vn4q/4NmbOJNvOC5xrCtSy1flq8+gl2mOtrEZAopbug=" >> /root/nexus-backend/.env');
    const res = await ssh.execCommand('pm2 restart nexus-backend-final && sleep 2 && pm2 logs nexus-backend-final --lines 10 --nostream');
    console.log(res.stdout);
    process.exit(0);
  } catch (err) { console.error(err); process.exit(1); }
}
run();
