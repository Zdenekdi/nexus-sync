const axios = require('axios');

async function testAI() {
  console.log('--- Testing AI Suggestions ---');
  try {
    const response = await axios.post('http://localhost:3000/api/ai/suggest-reply', {
      messageText: 'Kolik stojí hodina?',
      lang: 'cz'
    });
    console.log('AI Response:', JSON.stringify(response.data, null, 2));
    if (response.data.source === 'ai') {
      console.log('✅ SUCCESS: Real AI responded.');
    } else {
      console.log('⚠️ WARNING: Falling back to templates. Check if Ollama is running.');
    }
  } catch (error) {
    console.error('❌ AI Test Failed:', error.message);
  }
}

async function testAudit() {
  console.log('\n--- Testing Audit Log Signing ---');
  // This requires manual DB check or a dedicated endpoint test
  console.log('Note: Verification requires checking the "integrityHash" field in the AuditLog table.');
}

testAI();
