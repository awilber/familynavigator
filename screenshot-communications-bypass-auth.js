const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({
    headless: false, // Set to false to see what's happening
    slowMo: 500 // Slow down actions for visibility
  });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to home page...');
    await page.goto('http://localhost:4001/');
    
    // Wait for the page to load
    await page.waitForTimeout(2000);
    
    console.log('Looking for Skip Sign-In button...');
    
    // Try to find and click the Skip Sign-In (Debug Mode) button
    try {
      const skipButton = await page.getByText('Skip Sign-In (Debug Mode)');
      if (await skipButton.isVisible()) {
        console.log('Found Skip Sign-In button, clicking...');
        await skipButton.click();
        await page.waitForTimeout(2000);
      } else {
        console.log('Skip Sign-In button not visible, looking for other auth bypass methods...');
      }
    } catch (e) {
      console.log('Error clicking Skip Sign-In button:', e.message);
    }
    
    console.log('Now navigating to Communications page...');
    await page.goto('http://localhost:4001/Communications');
    await page.waitForTimeout(3000);
    
    // Check if we're still on the login page
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('login') || currentUrl === 'http://localhost:4001/') {
      console.log('Still on login page, trying alternative navigation...');
      // Try clicking skip sign-in again if we're back on login
      try {
        const skipButton = await page.getByText('Skip Sign-In');
        if (await skipButton.isVisible()) {
          console.log('Found Skip Sign-In button on login page, clicking...');
          await skipButton.click();
          await page.waitForTimeout(2000);
          // Now try navigating to Communications
          await page.goto('http://localhost:4001/Communications');
          await page.waitForTimeout(3000);
        }
      } catch (e) {
        console.log('Could not find or click skip sign-in button');
      }
    }
    
    console.log('Looking for email filtering panel...');
    
    // Try to find and scroll to the email filtering panel
    try {
      const selectors = [
        'text=Email Address Filtering',
        'text=Master Email Filter',
        '[data-testid*="filter"]',
        '[data-testid*="email"]', 
        '.email-filtering',
        '.email-address-filtering',
        '.filtering-panel',
        '[class*="filter"]',
        '[class*="email"]'
      ];
      
      let foundPanel = false;
      for (const selector of selectors) {
        try {
          const element = await page.locator(selector).first();
          if (await element.isVisible()) {
            await element.scrollIntoViewIfNeeded();
            await page.waitForTimeout(1000);
            console.log(`Found and scrolled to filtering panel with selector: ${selector}`);
            foundPanel = true;
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!foundPanel) {
        console.log('Email filtering panel not found with specific selectors');
        // Let's scroll down to see if the panel is below the fold
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      console.log('Error finding filtering panel:', e.message);
    }
    
    // Take screenshot
    const screenshotPath = '/Users/arlonwilber/Library/CloudStorage/GoogleDrive-awilber@wiredtriangle.com/Shared drives/AW/Personal/Projects/familynavigator/communications-email-filtering-screenshot.png';
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true
    });
    
    console.log(`Screenshot saved to: ${screenshotPath}`);
    
    // Get page title to verify we're on the right page
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // Get current URL to verify navigation
    const url = page.url();
    console.log(`Final URL: ${url}`);
    
    // Log some page content to help debug
    const headings = await page.locator('h1, h2, h3, h4').allTextContents();
    console.log('Page headings:', headings);
    
  } catch (error) {
    console.error('Error taking screenshot:', error);
  } finally {
    await browser.close();
  }
})();