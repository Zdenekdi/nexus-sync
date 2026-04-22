const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkMessage() {
  try {
    console.log('Connecting to production server...');
    await ssh.connect({
      host: '78.141.202.139',
      username: 'root',
      password: 'a3P!?Usa#v2e6Vf,'
    });
    console.log('Connected!');

    console.log('\n--- Searching for Test 124 & 125 in PM2 Logs ---');
    const logQuery = 'pm2 logs nexus-backend-final --lines 2000 --nostream | grep -E "Test 124|Test 125"';
    const logResult = await ssh.execCommand(logQuery);
    console.log('Log Search Results:', logResult.stdout || 'No match found in recent logs.');

    console.log('\n--- Searching for Test 124 & 125 in Database (nexus_prod) ---');
    const dbQuery = `PGPASSWORD='nexus_prod_2024!' psql -h localhost -U nexus -d nexus_prod -c "SELECT * FROM \\"ChatMessage\\" WHERE \\"content\\" ~ 'Test 12[45]' OR \\"text\\" ~ 'Test 12[45]'; "`;
    const dbResult = await ssh.execCommand(dbQuery);
    
    if (dbResult.stdout.includes('0 rows')) {
        console.log('Not found in ChatMessage. Checking Message table...');
        const dbQuery2 = `PGPASSWORD='nexus_prod_2024!' psql -h localhost -U nexus -d nexus_prod -c "SELECT * FROM \\"Message\\" WHERE \\"body\\" ~ 'Test 12[45]' OR \\"content\\" ~ 'Test 12[45]'; "`;
        const dbResult2 = await ssh.execCommand(dbQuery2);
        console.log(dbResult2.stdout);
    } else {
        console.log(dbResult.stdout);
    }

    ssh.dispose();
  } catch (error) {
    console.error('Check failed:', error);
  }
}

checkMessage();
