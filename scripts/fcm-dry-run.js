const { buildChatPushPayload, buildCallPushPayload } = require('../src/services/pushService');

const chatPayload = buildChatPushPayload({
  profileId: 'ldn-01',
  chatId: '987654',
  from: '+44 7700 900123',
  messagePreview: 'Are you available tonight?',
  profileName: 'Sophie (Central London)'
});

const callPayload = buildCallPushPayload({
  profileId: 'ldn-01',
  from: '+44 7700 900123',
  caller: '+44 7700 900123',
  profileName: 'Sophie (Central London)',
  callState: 'RINGING'
});

console.log('--- CHAT PAYLOAD ---');
console.log(JSON.stringify(chatPayload, null, 2));
console.log('\n--- CALL PAYLOAD ---');
console.log(JSON.stringify(callPayload, null, 2));

