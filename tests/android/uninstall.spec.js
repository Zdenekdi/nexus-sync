const { test, _android } = require('@playwright/test');

test('uninstall app', async () => {
  console.log('🔗 Connecting to Android device...');
  const [device] = await _android.devices();
  if (!device) {
    throw new Error('❌ No Android device found');
  }

  console.log(`📱 Found device: ${device.model()}`);
  console.log('🗑️ Uninstalling com.nexushub.app...');
  
  const output = await device.shell('pm uninstall com.nexushub.app');
  console.log(`✅ Result: ${output}`);
});
