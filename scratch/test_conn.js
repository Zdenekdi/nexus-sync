const net = require('net');
const client = net.createConnection({ port: 22, host: '78.141.202.139' }, () => {
  console.log('Connected to SSH port!');
  process.exit(0);
});
client.on('error', (err) => {
  console.error('Connection failed:', err.message);
  process.exit(1);
});
setTimeout(() => {
  console.log('Timeout');
  process.exit(1);
}, 5000);
