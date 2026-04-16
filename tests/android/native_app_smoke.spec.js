const { _android: android } = require('@playwright/test');
const { test, expect } = require('@playwright/test');

/**
 * Native App Smoke Test
 * 
 * This test handles the native Android device connection.
 * Note: Uses internal _android API which is the current way Playwright supports real devices.
 */
test('verify Nexus Relay app launch', async () => {
  console.log('🔗 Connecting to Android device...');
  
  // 1. Connect to the device via ADB
  const [device] = await android.devices();
  if (!device) {
    throw new Error('❌ No Android device detected. Make sure your phone is connected or emulator is running.');
  }
  
  console.log(`📱 Testing on device: ${device.model()}`);
  
  // 2. Launch the Nexus Relay app
  // Clear app data to ensure fresh state (simulates reinstall)
  console.log('🧹 Clearing app data for com.nexushub.app...');
  await device.shell('pm clear com.nexushub.app');

  await device.shell('am force-stop com.nexushub.app');
  await device.shell('am start -n com.nexushub.app/.MainActivity');
  
  // 3. Wait for the WebView to be available
  console.log('⏳ Searching for for WebView in com.nexushub.app...');
  const webviews = await device.webViews();
  console.log(`🔎 Found ${webviews.length} webviews`);
  
  let webview = webviews.find(wv => wv.pkg() === 'com.nexushub.app');
  if (!webview) {
    console.log('⏳ WebView not immediately found, waiting 10s...');
    webview = await device.webView({ pkg: 'com.nexushub.app' }, { timeout: 30000 });
  }
  
  // 4. Connect to the page inside the WebView
  console.log('🔗 Connecting to page...');
  const page = await webview.page();
  
  try {
    // 5. Verify the app content
    console.log('⏳ Page loading...');
    await page.waitForLoadState('domcontentloaded');
    
    // Log current URL
    console.log(`📍 URL inside app: ${page.url()}`);
    
    // Handle Onboarding Slides (4 slides)
    console.log('🏁 Starting Onboarding click-through...');
    const nextBtn = page.getByRole('button', { name: /pokračovat|continue/i }).first();
    let slidesClicked = 0;
    while (slidesClicked < 4 && await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log(`➡️ Clicking slide ${slidesClicked + 1}...`);
      await nextBtn.click();
      slidesClicked++;
      await page.waitForTimeout(500); // Wait for animation
    }

    // Click Vstoupit do aplikace / Enter Application
    console.log('🚀 Finalizing onboarding...');
    const enterBtn = page.getByRole('button', { name: /vstoupit|enter application/i }).first();
    if (await enterBtn.isVisible({ timeout: 5000 })) {
      await enterBtn.click();
    }

    // 6. Login Sequence (Using Operator Alice as requested)
    console.log('🔑 Performing login as Senior Operator (Alice)...');
    await page.getByTestId('login-email').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('login-email').fill('alice@nexus.sync');
    await page.getByTestId('login-password').fill('password123');
    await page.getByTestId('login-submit').click();

    // 7. Verify Dashboard (Calendar access for Operator)
    console.log('📊 Verifying operator dashboard access...');
    await expect(page.getByTestId('nav-link-calendar')).toBeVisible({ timeout: 30000 });
    
    // Take device-level screenshot of the dashboard
    console.log('📸 Capturing operator dashboard screenshot...');
    await device.screenshot({ path: 'android_operator_success.png' });
    console.log('✅ Screenshot saved: android_operator_success.png');
    
    console.log('🚀 Smoke Test PASSED successfully!');
  } catch (e) {
    console.error('❌ Test failed. Dumping state...');
    console.log(`📍 Last URL: ${page.url()}`);
    await device.screenshot({ path: 'android_error_screen.png' });
    throw e;
  }
  
  // Clean up
  await page.close();
});
