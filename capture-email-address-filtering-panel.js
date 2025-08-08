const playwright = require('playwright');

async function captureEmailAddressFilteringPanel() {
  console.log('🔍 Capturing Email Address Filtering Panel...');
  
  const browser = await playwright.chromium.launch({
    headless: false,
    timeout: 30000,
    slowMo: 500
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1400, height: 1000 }
    });
    const page = await context.newPage();
    
    console.log('📖 Step 1: Loading and navigating...');
    await page.goto('http://localhost:4001');
    await page.waitForTimeout(2000);
    
    await page.getByText('Skip Sign-In (Debug Mode)').click();
    await page.waitForTimeout(2000);
    
    await page.getByRole('button', { name: 'Communications' }).click();
    await page.waitForTimeout(3000);
    
    console.log('📖 Step 2: Looking for Email Address Filtering panel...');
    
    // Scroll down systematically to find the panel
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(1000);
    
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(1000);
    
    await page.evaluate(() => window.scrollTo(0, 1800));
    await page.waitForTimeout(1000);
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    
    // Look specifically for Email Address Filtering panel
    try {
      const emailAddressPanel = await page.locator('text=Email Address Filtering').first();
      if (await emailAddressPanel.isVisible()) {
        console.log('✅ Found Email Address Filtering panel!');
        await emailAddressPanel.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);
      } else {
        console.log('🔍 Searching for alternative selectors...');
        
        // Try other possible selectors for the email address filtering panel
        const selectors = [
          'text=Master Email Filter',
          'text=Email Addresses',
          '[data-testid*="email-address"]',
          '[class*="email-address"]',
          'text=No email addresses found'
        ];
        
        for (const selector of selectors) {
          try {
            const element = await page.locator(selector).first();
            if (await element.isVisible()) {
              console.log(`✅ Found panel with selector: ${selector}`);
              await element.scrollIntoViewIfNeeded();
              await page.waitForTimeout(1000);
              break;
            }
          } catch (e) {
            // Continue to next selector
          }
        }
      }
    } catch (e) {
      console.log('Panel search error:', e.message);
    }
    
    console.log('📖 Step 3: Taking focused screenshot...');
    const screenshotPath = '/Users/arlonwilber/Library/CloudStorage/GoogleDrive-awilber@wiredtriangle.com/Shared drives/AW/Personal/Projects/familynavigator/email-address-filtering-panel-focused.png';
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    
    console.log(`📸 Screenshot saved to: ${screenshotPath}`);
    
    // Also take a viewport-only screenshot to focus on what's currently visible
    const viewportScreenshotPath = '/Users/arlonwilber/Library/CloudStorage/GoogleDrive-awilber@wiredtriangle.com/Shared drives/AW/Personal/Projects/familynavigator/email-address-filtering-panel-viewport.png';
    await page.screenshot({ 
      path: viewportScreenshotPath,
      fullPage: false 
    });
    
    console.log(`📸 Viewport screenshot saved to: ${viewportScreenshotPath}`);
    
    console.log('🔍 Browser will stay open for manual inspection...');
    await page.waitForTimeout(8000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

captureEmailAddressFilteringPanel().catch(console.error);