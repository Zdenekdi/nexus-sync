const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkBindings() {
  try {
    await ssh.connect({
      host: '78.141.202.139',
      username: 'root',
      password: 'a3P!?Usa#v2e6Vf,'
    });

    console.log('\n--- Checking Last 10 Device Bindings ---');
    const dbQuery = `PGPASSWORD='nexus_prod_2024!' psql -h localhost -U nexus -d nexus_prod -c 'SELECT "installationId", "active", "lastSeenAt", "model", "deviceName", "profileId" FROM "DeviceBinding" ORDER BY "lastSeenAt" DESC LIMIT 10;'`;
    const dbResult = await ssh.execCommand(dbQuery);
    console.log(dbResult.stdout);

    ssh.dispose();
  } catch (error) {
    console.error('Check failed:', error);
  }
}

checkBindings();
