require('dotenv').config();
const app = require('./app');

const http = require('http');
const socketService = require('./services/socket');

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

// Initialize Socket.io
socketService.init(server);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
