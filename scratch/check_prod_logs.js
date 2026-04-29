const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function getLogs() {
  try {
    await ssh.connect({
      host: '78.141.202.139',
      username: 'root',
      password: 'a3P!?Usa#v2e6Vf,'
    });
    console.log('--- PM2 LOGS (Last 100 lines) ---');
    const result = await ssh.execCommand('pm2 logs nexus-backend-final --lines 100 --nostream');
    console.log(result.stdout);
    console.log(result.stderr);
    
    console.log('\n--- SOCKET CONNECTIONS (NETSTAT) ---');
    const netstat = await ssh.execCommand('netstat -an | grep :3000 | grep ESTABLISHED | wc -l');
    console.log('Active established connections on 3000:', netstat.stdout);

    ssh.dispose();
  } catch (err) {
    console.error('SSH Error:', err);
  }
}
getLogs();
