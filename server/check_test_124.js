const { NodeSSH } = require('node-ssh');
const { buildSshConfig, shellQuote } = require('./scripts/ssh-env');
const ssh = new NodeSSH();

async function checkMessage() {
  try {
    console.log('Connecting to production server...');
    await ssh.connect(buildSshConfig());
    console.log('Connected!');

    const dbPassword = process.env.NEXUS_DB_PASSWORD || process.env.PGPASSWORD;
    if (!dbPassword) {
      throw new Error('NEXUS_DB_PASSWORD or PGPASSWORD is required for database checks');
    }

    const dbHost = process.env.NEXUS_DB_HOST || 'localhost';
    const dbUser = process.env.NEXUS_DB_USER || 'nexus';
    const dbName = process.env.NEXUS_DB_NAME || 'nexus_prod';
    const psql = (sql) => [
      `PGPASSWORD=${shellQuote(dbPassword)}`,
      'psql',
      '-h', shellQuote(dbHost),
      '-U', shellQuote(dbUser),
      '-d', shellQuote(dbName),
      '-c', shellQuote(sql)
    ].join(' ');

    console.log('\n--- Searching for Test 124 & 125 in PM2 Logs ---');
    const logQuery = 'pm2 logs nexus-backend-final --lines 2000 --nostream | grep -E "Test 124|Test 125"';
    const logResult = await ssh.execCommand(logQuery);
    console.log('Log Search Results:', logResult.stdout || 'No match found in recent logs.');

    console.log('\n--- Searching for Test 124 & 125 in Database (nexus_prod) ---');
    const dbQuery = psql('SELECT * FROM "ChatMessage" WHERE "content" ~ \'Test 12[45]\' OR "text" ~ \'Test 12[45]\';');
    const dbResult = await ssh.execCommand(dbQuery);
    
    if (dbResult.stdout.includes('0 rows')) {
        console.log('Not found in ChatMessage. Checking Message table...');
        const dbQuery2 = psql('SELECT * FROM "Message" WHERE "body" ~ \'Test 12[45]\' OR "content" ~ \'Test 12[45]\';');
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
