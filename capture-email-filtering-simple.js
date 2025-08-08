const playwright = require('playwright');

async function captureEmailFilteringSimple() {
  console.log('🔍 Simple Email Filtering Panel Screenshot...');
  
  const browser = await playwright.chromium.launch({
    headless: false,
    timeout: 30000,
    slowMo: 1000 // Slow down for visibility
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1400, height: 1000 }
    });
    const page = await context.newPage();
    
    console.log('📖 Step 1: Loading home page...');
    await page.goto('http://localhost:4001');
    await page.waitForTimeout(3000);
    
    console.log('📖 Step 2: Clicking Skip Sign-In...');
    // Click Skip Sign-In using the text we know exists
    await page.getByText('Skip Sign-In (Debug Mode)').click();
    await page.waitForTimeout(3000);
    
    console.log('📖 Step 3: Looking for Communications in sidebar...');
    // Now click on Communications from the sidebar - use the button role to be specific
    await page.getByRole('button', { name: 'Communications' }).click();
    await page.waitForTimeout(4000);
    
    console.log('📖 Step 4: Checking current page...');
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    // Scroll down to see the email filtering panel
    console.log('📖 Step 5: Scrolling to find email filtering panel...');
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(1000);
    
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(1000);
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    
    console.log('📖 Step 6: Taking final screenshot...');
    const screenshotPath = '/Users/arlonwilber/Library/CloudStorage/GoogleDrive-awilber@wiredtriangle.com/Shared drives/AW/Personal/Projects/familynavigator/email-filtering-final-capture.png';
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    
    console.log(`📸 Screenshot saved to: ${screenshotPath}`);
    console.log(`📊 Final URL: ${currentUrl}`);
    
    // Keep browser open for manual inspection
    console.log('🔍 Browser will stay open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

captureEmailFilteringSimple().catch(console.error);