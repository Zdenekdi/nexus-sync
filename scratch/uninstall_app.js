const { _android } = require('playwright');

(async () => {
  console.log('🔗 Connecting to Android device...');
  const [device] = await _android.devices();
  if (!device) {
    console.error('❌ No Android device found');
    process.exit(1);
  }

  console.log(`📱 Found device: ${device.model()}`);
  console.log('🗑️ Uninstalling com.nexushub.app...');
  
  try {
    const output = await device.shell('pm uninstall com.nexushub.app');
    console.log(`✅ Result: ${output}`);
  } catch (e) {
    console.error('❌ Error during uninstall:', e.message);
  }

  await device.close();
  process.exit(0);
})();
