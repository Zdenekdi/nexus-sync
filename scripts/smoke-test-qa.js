/**
 * QA Attribution Smoke Test
 * Verifies that the backend API returns operator (sender) information for QA purposes.
 */
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const API_BASE = process.env.VITE_API_URL || 'http://localhost:5000/api';
// Use a token from environment or provide one here for manual runs
const TOKEN = process.env.TEST_TOKEN;

async function runSmokeTest() {
  if (!TOKEN) {
    console.error('❌ ERROR: TEST_TOKEN is missing in environment.');
    console.log('Please run with: TEST_TOKEN=your_token node scripts/smoke-test-qa.js');
    process.exit(1);
  }

  console.log('🚀 Starting QA Attribution Smoke Test...');

  try {
    // 1. Test /api/chats (The list view)
    console.log('\n--- Testing /api/chats ---');
    const chatRes = await axios.get(`${API_BASE}/chats`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });

    if (!Array.isArray(chatRes.data)) {
      throw new Error('Expected array from /api/chats');
    }

    console.log(`✅ Received ${chatRes.data.length} chats.`);
    
    const outboundChats = chatRes.data.filter(c => c.messages?.[0]?.direction === 'OUTBOUND');
    if (outboundChats.length > 0) {
      const first = outboundChats[0].messages[0];
      if (first.sender && first.sender.name) {
        console.log(`✅ SUCCESS: Found sender attribution in chat list: "${first.sender.name}"`);
      } else {
        console.warn('⚠️ WARNING: Found outbound message but SENDER info is missing!');
      }
    } else {
      console.log('ℹ️ No outbound messages found in recent chats to verify list attribution.');
    }

    // 2. Test /api/messages/:chatId (The history view)
    if (chatRes.data.length > 0) {
      const chatId = chatRes.data[0].id;
      console.log(`\n--- Testing /api/messages/${chatId} (Full History) ---`);
      
      const msgRes = await axios.get(`${API_BASE}/messages/${chatId}`, {
        headers: { Authorization: `Bearer ${TOKEN}` }
      });

      if (!Array.isArray(msgRes.data)) {
        throw new Error('Expected array from /api/messages');
      }

      console.log(`✅ Received ${msgRes.data.length} messages in history.`);
      
      const outboundMsgs = msgRes.data.filter(m => m.direction === 'OUTBOUND');
      if (outboundMsgs.length > 0) {
        const hasAllSenders = outboundMsgs.every(m => m.sender && m.sender.name);
        if (hasAllSenders) {
          console.log(`✅ SUCCESS: All ${outboundMsgs.length} outbound messages have sender names.`);
        } else {
          console.warn('⚠️ WARNING: Some outbound messages are missing sender attribution!');
        }
      } else {
        console.log('ℹ️ No outbound messages found in this chat history.');
      }
    }

    console.log('\n✨ Smoke test completed successfully!');
  } catch (err) {
    console.error(`\n❌ SMOKE TEST FAILED: ${err.message}`);
    if (err.response) {
      console.error('Response status:', err.response.status);
      console.error('Response data:', err.response.data);
    }
    process.exit(1);
  }
}

runSmokeTest();
