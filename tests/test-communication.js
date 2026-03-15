const io = require('socket.io-client');
const axios = require('axios');

const API_URL = 'http://localhost:3001/api';
const SOCKET_URL = 'http://localhost:3001';

async function runTest() {
  console.log('--- Starting Communication Test ---');

  try {
    // 1. Login to get token
    console.log('Logging in...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@nexus.ai',
      password: 'password123'
    });
    const token = loginRes.data.token;
    console.log('Login successful.');

    // 2. Connect to Socket.io
    console.log('Connecting to Socket.io...');
    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    // 3. Setup event listeners
    let newMessageReceived = false;
    let messageUpdatedReceived = false;

    socket.on('new_message', (data) => {
      console.log('Event received: new_message', data.message.text);
      newMessageReceived = true;
    });

    socket.on('message_updated', (data) => {
      console.log('Event received: message_updated', data.message.status);
      messageUpdatedReceived = true;
    });

    // Wait a bit for connection
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. Simulate inbound message
    console.log('Simulating inbound message...');
    const simulateRes = await axios.post(`${API_URL}/messages/simulate`, {
      externalId: '123456789',
      profileId: 'diana',
      text: 'Test message from Diana'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const messageId = simulateRes.data.id;
    console.log('Simulation call successful. Message ID:', messageId);

    // Wait for socket event
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 5. Mark as read
    console.log('Marking message as read...');
    await axios.patch(`${API_URL}/messages/${messageId}/read`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Wait for socket event
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 6. Summary
    console.log('\n--- Test Result ---');
    console.log('New message event received:', newMessageReceived);
    console.log('Message updated event received:', messageUpdatedReceived);

    if (newMessageReceived && messageUpdatedReceived) {
      console.log('SUCCESS: Communication module is working as expected.');
    } else {
      console.log('FAILURE: Some events were missed.');
    }

    socket.close();
    process.exit(newMessageReceived && messageUpdatedReceived ? 0 : 1);

  } catch (error) {
    console.error('Test failed with error:', error.response ? error.response.data : error.message);
    process.exit(1);
  }
}

runTest();
