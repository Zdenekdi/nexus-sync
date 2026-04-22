const { NodeSSH } = require('node-ssh');
const path = require('path');

const ssh = new NodeSSH();

async function diagnose() {
  try {
    console.log('Connecting to server 78.141.202.139...');
    await ssh.connect({
      host: '78.141.202.139',
      username: 'root',
      password: 'a3P!?Usa#v2e6Vf,'
    });
    console.log('Connected successfully!');

    // 1. PM2 Status
    console.log('\n--- PM2 Status ---');
    const pm2List = await ssh.execCommand('pm2 list');
    console.log(pm2List.stdout);

    // 2. PM2 Logs (nexus-backend-final)
    console.log('\n--- Recent Logs (nexus-backend-final) ---');
    const pm2Logs = await ssh.execCommand('pm2 logs nexus-backend-final --lines 50 --nostream');
    console.log(pm2Logs.stdout);
    console.log(pm2Logs.stderr);

    // 3. Database Check
    console.log('\n--- Device Bindings in Database ---');
    // Force password auth with -h localhost
    const dbQuery = `PGPASSWORD='nexus_prod_2024!' psql -h localhost -U nexus -d nexus_prod -c 'SELECT "installationId", "active", "lastSeenAt", "model", "deviceName" FROM "DeviceBinding" ORDER BY "lastSeenAt" DESC LIMIT 10;'`;
    const dbResult = await ssh.execCommand(dbQuery);
    console.log(dbResult.stdout);
    if (dbResult.stderr) console.error('DB Error:', dbResult.stderr);

    // 4. Check specific device from logs
    console.log('\n--- Checking specific device: inst_0b8b51255549a43c12ee651b ---');
    const deviceCheck = await ssh.execCommand(`PGPASSWORD='nexus_prod_2024!' psql -h localhost -U nexus -d nexus_prod -c "SELECT * FROM \\"DeviceBinding\\" WHERE \\"installationId\\" = 'inst_0b8b51255549a43c12ee651b';"`);
    console.log(deviceCheck.stdout);

    // 5. Environment & Modules Check
    console.log('\n--- Production Environment Check ---');
    const momentCheck = await ssh.execCommand('ls /root/nexus-backend/node_modules/moment || ls /root/nexus-hub/server/node_modules/moment');
    console.log('Server moment module found:', momentCheck.stdout ? 'Yes' : 'No');
    
    const pkgCheck = await ssh.execCommand('grep "moment" /root/nexus-backend/package.json || grep "moment" /root/nexus-hub/server/package.json');
    console.log('moment in package.json:', pkgCheck.stdout || 'No');

    ssh.dispose();
  } catch (error) {
    console.error('Diagnosis failed:', error);
    process.exit(1);
  }
}

diagnose();
