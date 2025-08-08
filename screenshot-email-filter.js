const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to Communications page...');
    await page.goto('http://localhost:4001/Communications');
    
    // Wait for the page to load
    await page.waitForTimeout(3000);
    console.log('Page loaded, looking for email filtering panel...');
    
    // Try to find and scroll to the email filtering panel
    try {
      // Look for various selectors that might identify the filtering panel
      const selectors = [
        '[data-testid*="filter"]',
        '[data-testid*="email"]', 
        '.email-filtering',
        '.email-address-filtering',
        '.filtering-panel',
        'text=Email Address Filtering',
        'text=Master Email Filter',
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
        console.log('Email filtering panel not found with specific selectors, checking page content...');
        // Check if there's any email-related content on the page
        const pageContent = await page.content();
        if (pageContent.includes('filter') || pageContent.includes('email')) {
          console.log('Found email/filter content on page');
        } else {
          console.log('No email/filter content found on page');
        }
      }
    } catch (e) {
      console.log('Error finding filtering panel, taking full page screenshot:', e.message);
    }
    
    // Take screenshot
    const screenshotPath = '/Users/arlonwilber/Library/CloudStorage/GoogleDrive-awilber@wiredtriangle.com/Shared drives/AW/Personal/Projects/familynavigator/email-filtering-panel-screenshot.png';
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
    console.log(`Current URL: ${url}`);
    
  } catch (error) {
    console.error('Error taking screenshot:', error);
  } finally {
    await browser.close();
  }
})();