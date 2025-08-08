const playwright = require('playwright');

async function captureEmailFilteringPanel() {
  console.log('🔍 Starting Email Filtering Panel Screenshot...');
  
  const browser = await playwright.chromium.launch({
    headless: false,
    timeout: 30000
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1400, height: 1000 }
    });
    const page = await context.newPage();
    
    // Capture console logs and errors
    const consoleMessages = [];
    const jsErrors = [];
    
    page.on('console', (msg) => {
      const message = `[${msg.type()}] ${msg.text()}`;
      console.log('Console:', message);
      consoleMessages.push(message);
    });
    
    page.on('pageerror', (error) => {
      const errorMessage = `JavaScript Error: ${error.message}`;
      console.log('❌', errorMessage);
      jsErrors.push(errorMessage);
    });
    
    console.log('📖 Navigating to http://localhost:4001...');
    await page.goto('http://localhost:4001', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for React to render
    await page.waitForTimeout(3000);
    
    // Take screenshot of home page
    await page.screenshot({ 
      path: '/Users/arlonwilber/Library/CloudStorage/GoogleDrive-awilber@wiredtriangle.com/Shared drives/AW/Personal/Projects/familynavigator/step1-home.png',
      fullPage: true 
    });
    console.log('📸 Home page screenshot saved');
    
    // Check if there's a skip sign-in debug mode button
    console.log('🔍 Looking for Skip Sign-In debug mode...');
    
    let skipSignInFound = false;
    
    // Try to find skip sign-in button by text content
    try {
      const element = await page.evaluateHandle(() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        while (node = walker.nextNode()) {
          if (node.textContent.includes('Skip Sign-In')) {
            return node.parentElement;
          }
        }
        return null;
      });
      
      if (element && await element.isVisible()) {
        await element.click();
        console.log('✅ Clicked Skip Sign-In debug button');
        skipSignInFound = true;
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      console.log('First attempt failed, trying alternative approach...');
    }
    
    if (!skipSignInFound) {
      // Try alternative approach - look for any clickable element containing skip
      try {
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
          skipSignInFound = true;
          console.log('✅ Found and clicked skip button');
          await page.waitForTimeout(2000);
        }
      } catch (e) {
        console.log('⚠️ Could not find skip sign-in option');
      }
    }
    
    // Take screenshot after potential skip
    await page.screenshot({ 
      path: '/Users/arlonwilber/Library/CloudStorage/GoogleDrive-awilber@wiredtriangle.com/Shared drives/AW/Personal/Projects/familynavigator/step2-after-skip.png',
      fullPage: true 
    });
    console.log('📸 Screenshot after skip attempt saved');
    
    // Try to navigate directly to Communications page
    console.log('🔍 Navigating directly to Communications...');
    try {
      await page.goto('http://localhost:4001/Communications', {
        waitUntil: 'networkidle',
        timeout: 15000
      });
      await page.waitForTimeout(3000);
      console.log('✅ Successfully navigated to Communications page');
    } catch (e) {
      console.log('Direct navigation failed, trying to find nav link...');
      
      // Look for navigation to Communications
      console.log('🔍 Looking for Communications navigation...');
      
      // Try to find and click Communications link/button
      const communicationsSelectors = [
        'a[href*="communications"]',
        'a[href*="Communications"]',
        '[data-testid="communications"]',
        '.nav-item',
        '.menu-item'
      ];
      
      let communicationsFound = false;
      for (const selector of communicationsSelectors) {
        try {
          const elements = await page.locator(selector).all();
          for (const element of elements) {
            const text = await element.textContent();
            if (text && text.toLowerCase().includes('communications')) {
              console.log(`✅ Found Communications element: ${text}`);
              await element.click();
              communicationsFound = true;
              break;
            }
          }
          if (communicationsFound) break;
        } catch (e) {
          // Try next selector
        }
      }
      
      if (!communicationsFound) {
        console.log('🔍 Trying to find Communications by text content...');
        const clicked = await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('*'));
          const commEl = elements.find(el => 
            el.textContent && 
            el.textContent.toLowerCase().includes('communications') &&
            (el.tagName === 'A' || el.tagName === 'BUTTON' || el.onclick || el.style.cursor === 'pointer')
          );
          if (commEl) {
            commEl.click();
            return true;
          }
          return false;
        });
        
        if (clicked) {
          console.log('✅ Clicked Communications element');
          await page.waitForTimeout(2000);
        }
      }
    }
    
    // Take screenshot of current page
    await page.screenshot({ 
      path: '/Users/arlonwilber/Library/CloudStorage/GoogleDrive-awilber@wiredtriangle.com/Shared drives/AW/Personal/Projects/familynavigator/step3-communications-attempt.png',
      fullPage: true 
    });
    console.log('📸 Communications page attempt screenshot saved');
    
    // Check current URL and page content
    const currentUrl = page.url();
    const pageTitle = await page.title();
    console.log(`Current URL: ${currentUrl}`);
    console.log(`Page title: ${pageTitle}`);
    
    // Look for Email Filtering panel on current page
    console.log('🔍 Looking for Email Filtering panel...');
    
    // Scroll down to see if there's more content
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(1000);
    
    // Look for email filtering content
    const emailFilteringFound = await page.evaluate(() => {
      const content = document.body.textContent;
      return content.includes('Email Filtering') || 
             content.includes('email filtering') || 
             content.includes('Email Address') ||
             content.includes('No email addresses found') ||
             content.includes('Master Email Filter');
    });
    
    if (emailFilteringFound) {
      console.log('✅ Found Email Filtering content on page');
      
      // Try to scroll to the specific filtering section
      try {
        const filteringElement = await page.locator('text=Email').first();
        if (await filteringElement.isVisible()) {
          await filteringElement.scrollIntoViewIfNeeded();
          await page.waitForTimeout(1000);
          console.log('✅ Scrolled to email filtering content');
        }
      } catch (e) {
        console.log('Could not scroll to specific filtering element');
      }
    }
    
    // Final screenshot - this should show the email filtering panel if accessible
    const finalScreenshotPath = '/Users/arlonwilber/Library/CloudStorage/GoogleDrive-awilber@wiredtriangle.com/Shared drives/AW/Personal/Projects/familynavigator/email-filtering-panel-final.png';
    await page.screenshot({ 
      path: finalScreenshotPath,
      fullPage: true 
    });
    console.log(`📸 Final screenshot with email filtering panel saved to: ${finalScreenshotPath}`);
    
    // Print summary
    console.log('\n📋 SCREENSHOT RESULTS:');
    console.log('================');
    console.log(`🔗 Final URL: ${currentUrl}`);
    console.log(`📄 Page title: ${pageTitle}`);
    console.log(`📧 Email Filtering content found: ${emailFilteringFound ? 'YES' : 'NO'}`);
    console.log(`❌ JavaScript errors: ${jsErrors.length}`);
    
    if (jsErrors.length > 0) {
      console.log('\n🚨 JavaScript Errors Found:');
      jsErrors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Screenshot capture failed:', error.message);
  } finally {
    await browser.close();
  }
}

captureEmailFilteringPanel().catch(console.error);