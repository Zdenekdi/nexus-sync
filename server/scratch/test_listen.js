const http = require('http');
const server = http.createServer((req, res) => res.end('ok'));
server.listen(3001, '127.0.0.1', () => {
  console.log('Listening on', server.address());
  process.exit(0);
});
server.on('error', (err) => {
  console.error('Error:', err);
  process.exit(1);
});
