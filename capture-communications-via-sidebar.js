const playwright = require('playwright');

async function captureEmailFilteringViaNavigation() {
  console.log('🔍 Starting Email Filtering Panel Screenshot via Navigation...');
  
  const browser = await playwright.chromium.launch({
    headless: false,
    timeout: 30000
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1400, height: 1000 }
    });
    const page = await context.newPage();
    
    console.log('📖 Navigating to http://localhost:4001...');
    await page.goto('http://localhost:4001', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for React to render
    await page.waitForTimeout(3000);
    
    console.log('🔍 Looking for Skip Sign-In debug mode...');
    
    // Click the Skip Sign-In button
    const clicked = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));
      const skipElement = allElements.find(el => 
        el.textContent && 
        el.textContent.toLowerCase().includes('skip') &&
        (el.tagName === 'A' || el.tagName === 'BUTTON' || el.onclick || el.style.cursor === 'pointer' || el.getAttribute('role') === 'button')
      );
      if (skipElement) {
        skipElement.click();
        return true;
      }
      return false;
    });
    
    if (clicked) {
      console.log('✅ Clicked Skip Sign-In button');
      await page.waitForTimeout(3000);
    }
    
    // Now click on the Communications link in the sidebar
    console.log('🔍 Looking for Communications link in sidebar...');
    
    try {
      // Try multiple approaches to find the Communications link
      const communicationsLink = await page.locator('text=Communications').first();
      if (await communicationsLink.isVisible()) {
        console.log('✅ Found Communications link, clicking...');
        await communicationsLink.click();
        await page.waitForTimeout(3000);
      } else {
        console.log('Communications text not found, trying CSS selectors...');
        
        // Try finding by CSS selectors
        const selectors = [
          'a[href*="communications"]',
          'a[href*="Communications"]',
          '.nav-item:has-text("Communications")',
          '[data-testid*="communications"]'
        ];
        
        for (const selector of selectors) {
          try {
            const element = await page.locator(selector).first();
            if (await element.isVisible()) {
              console.log(`✅ Found Communications link with selector: ${selector}`);
              await element.click();
              await page.waitForTimeout(3000);
              break;
            }
          } catch (e) {
            console.log(`Selector ${selector} not found`);
          }
        }
      }
    } catch (e) {
      console.log('Error clicking Communications link:', e.message);
    }
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    // Wait a bit more for the page to fully load
    await page.waitForTimeout(2000);
    
    // Look for email filtering content
    console.log('🔍 Looking for Email Filtering content...');
    
    // Scroll down to find the email filtering panel
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(1000);
    
    // Try to find email filtering panel elements
    const emailFilteringSelectors = [
      'text=Email Address Filtering',
      'text=Master Email Filter',
      '[data-testid*="email-filter"]',
      '.email-filtering-panel',
      '[class*="EmailFilter"]'
    ];
    
    let foundEmailFiltering = false;
    for (const selector of emailFilteringSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible()) {
          console.log(`✅ Found email filtering element: ${selector}`);
          await element.scrollIntoViewIfNeeded();
          await page.waitForTimeout(1000);
          foundEmailFiltering = true;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!foundEmailFiltering) {
      // Check if we can find any text containing email filtering
      const hasEmailContent = await page.evaluate(() => {
        const text = document.body.textContent.toLowerCase();
        return text.includes('email') && (text.includes('filter') || text.includes('address'));
      });
      
      if (hasEmailContent) {
        console.log('✅ Found email-related content on page');
        foundEmailFiltering = true;
      } else {
        console.log('❌ No email filtering content found');
      }
    }
    
    // Take the final screenshot
    const finalScreenshotPath = '/Users/arlonwilber/Library/CloudStorage/GoogleDrive-awilber@wiredtriangle.com/Shared drives/AW/Personal/Projects/familynavigator/communications-page-with-email-filtering.png';
    await page.screenshot({ 
      path: finalScreenshotPath,
      fullPage: true 
    });
    console.log(`📸 Final screenshot saved to: ${finalScreenshotPath}`);
    
    // Print summary
    console.log('\n📋 SCREENSHOT RESULTS:');
    console.log('================');
    console.log(`🔗 Final URL: ${currentUrl}`);
    console.log(`📧 Email Filtering content found: ${foundEmailFiltering ? 'YES' : 'NO'}`);
    console.log(`📸 Screenshot path: ${finalScreenshotPath}`);
    
    // Also take a screenshot focused on just the visible viewport (not full page)
    const viewportScreenshotPath = '/Users/arlonwilber/Library/CloudStorage/GoogleDrive-awilber@wiredtriangle.com/Shared drives/AW/Personal/Projects/familynavigator/email-filtering-viewport.png';
    await page.screenshot({ 
      path: viewportScreenshotPath,
      fullPage: false 
    });
    console.log(`📸 Viewport screenshot saved to: ${viewportScreenshotPath}`);
    
  } catch (error) {
    console.error('❌ Screenshot capture failed:', error.message);
  } finally {
    await browser.close();
  }
}

captureEmailFilteringViaNavigation().catch(console.error);