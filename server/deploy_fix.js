const { NodeSSH } = require('node-ssh');
const path = require('path');
const { buildSshConfig } = require('./scripts/ssh-env');

const ssh = new NodeSSH();

async function deploy() {
  try {
    console.log('Connecting to server for deployment...');
    await ssh.connect(buildSshConfig());
    console.log('Connected!');

    const remotePath = '/root/nexus-backend';

    // 1. Upload package.json
    console.log('Uploading package.json...');
    await ssh.putFile(
      path.join(__dirname, 'package.json'),
      `${remotePath}/package.json`
    );

    // 2. Upload deviceController.js
    console.log('Uploading deviceController.js...');
    await ssh.putFile(
      path.join(__dirname, 'src/controllers/deviceController.js'),
      `${remotePath}/src/controllers/deviceController.js`
    );

    // 3. Run npm install and restart
    console.log('Installing dependencies and restarting PM2...');
    const result = await ssh.execCommand('npm install --production && pm2 restart nexus-backend-final', { cwd: remotePath });
    
    console.log('STDOUT:', result.stdout);
    if (result.stderr) console.error('STDERR:', result.stderr);

    console.log('Deployment completed successfully!');
    ssh.dispose();
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

deploy();
