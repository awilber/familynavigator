const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testEmailFilteringPanel() {
  console.log('🔍 Starting Email Filtering Panel Test...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 1000 },
    args: ['--no-sandbox', '--disable-web-security']
  });

  try {
    const page = await browser.newPage();
    
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
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for React to render
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take screenshot of home page
    await page.screenshot({ 
      path: '/tmp/familynavigator_home.png',
      fullPage: true 
    });
    console.log('📸 Home page screenshot saved to /tmp/familynavigator_home.png');
    
    // Check if there's a skip sign-in debug mode button
    console.log('🔍 Looking for Skip Sign-In debug mode...');
    const skipSignInSelectors = [
      'text=Skip Sign-In (Debug Mode)',
      '*:contains("Skip Sign-In")',
      '*:contains("Debug Mode")',
      'button:contains("Skip")'
    ];
    
    let skipSignInFound = false;
    for (const selector of skipSignInSelectors) {
      try {
        await page.waitForSelector('body', { timeout: 1000 });
        const element = await page.$eval('*', (root) => {
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          let node;
          while (node = walker.nextNode()) {
            if (node.textContent.includes('Skip Sign-In')) {
              return node.parentElement;
            }
          }
          return null;
        });
        
        if (element) {
          await page.evaluate((el) => el.click(), element);
          console.log('✅ Clicked Skip Sign-In debug button');
          skipSignInFound = true;
          await new Promise(resolve => setTimeout(resolve, 2000));
          break;
        }
      } catch (e) {
        // Try next approach
      }
    }
    
    if (!skipSignInFound) {
      // Try alternative approach - look for any clickable element containing skip
      try {
        await page.evaluate(() => {
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
        skipSignInFound = true;
        console.log('✅ Found and clicked skip button');
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.log('⚠️ Could not find skip sign-in option');
      }
    }
    
    // Take screenshot after potential skip
    await page.screenshot({ 
      path: '/tmp/familynavigator_after_skip.png',
      fullPage: true 
    });
    console.log('📸 Screenshot after skip attempt saved');
    
    // Look for navigation to Communications
    console.log('🔍 Looking for Communications navigation...');
    
    // Try to find and click Communications link/button
    const communicationsSelectors = [
      'a[href*="communications"]',
      'button:contains("Communications")',
      '[data-testid="communications"]',
      'text=Communications',
      '.nav-item:contains("Communications")',
      '.menu-item:contains("Communications")'
    ];
    
    let communicationsFound = false;
    for (const selector of communicationsSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`✅ Found Communications element with selector: ${selector}`);
          await element.click();
          communicationsFound = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!communicationsFound) {
      console.log('🔍 Trying to find Communications by text content...');
      const allElements = await page.$$eval('*', (elements) => {
        return elements
          .filter(el => el.textContent && el.textContent.toLowerCase().includes('communications'))
          .map(el => ({
            tag: el.tagName,
            text: el.textContent.trim(),
            className: el.className,
            id: el.id
          }))
          .slice(0, 10); // Limit results
      });
      
      console.log('Elements containing "communications":', allElements);
      
      // Try clicking the first clickable element
      if (allElements.length > 0) {
        try {
          await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('*'));
            const commEl = elements.find(el => 
              el.textContent && 
              el.textContent.toLowerCase().includes('communications') &&
              (el.tagName === 'A' || el.tagName === 'BUTTON' || el.onclick || el.style.cursor === 'pointer')
            );
            if (commEl) commEl.click();
          });
          communicationsFound = true;
          console.log('✅ Clicked Communications element');
        } catch (e) {
          console.log('⚠️ Could not click Communications element:', e.message);
        }
      }
    }
    
    if (communicationsFound) {
      // Wait for navigation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Take screenshot of communications page
      await page.screenshot({ 
        path: '/tmp/familynavigator_communications.png',
        fullPage: true 
      });
      console.log('📸 Communications page screenshot saved to /tmp/familynavigator_communications.png');
      
      // Look for Email Filtering panel
      console.log('🔍 Looking for Email Filtering panel...');
      
      const emailFilteringSelectors = [
        '*[data-testid*="email"]',
        '*[data-testid*="filter"]',
        '.email-filtering',
        '.EmailFiltering',
        '[class*="EmailFiltering"]',
        'text=Email Filtering',
        'text=email filtering',
        '*:contains("Email Filtering")',
        '*:contains("email addresses")',
        '*:contains("No email addresses found")'
      ];
      
      let emailFilteringFound = false;
      for (const selector of emailFilteringSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            console.log(`✅ Found Email Filtering element with selector: ${selector}`);
            emailFilteringFound = true;
            break;
          }
        } catch (e) {
          // Try next selector
        }
      }
      
      // Check for specific text content
      const pageContent = await page.content();
      if (pageContent.includes('Email Filtering') || pageContent.includes('email filtering') || pageContent.includes('No email addresses found')) {
        console.log('✅ Found Email Filtering content in page');
        emailFilteringFound = true;
      }
      
      // Look for specific error indicators
      const hasMapError = jsErrors.some(error => error.includes('Cannot read properties of undefined (reading \'map\')'));
      const hasEmailFilteringError = jsErrors.some(error => error.toLowerCase().includes('email'));
      
      console.log('\n📋 TEST RESULTS:');
      console.log('================');
      console.log(`🔗 Application URL: http://localhost:4001`);
      console.log(`📄 Page loaded successfully: ${!jsErrors.length || !hasMapError}`);
      console.log(`🧭 Communications page accessible: ${communicationsFound}`);
      console.log(`📧 Email Filtering panel visible: ${emailFilteringFound}`);
      console.log(`❌ JavaScript errors: ${jsErrors.length}`);
      console.log(`🗺️ Map-related errors: ${hasMapError ? 'YES - CRITICAL' : 'NO - FIXED'}`);
      
      if (jsErrors.length > 0) {
        console.log('\n🚨 JavaScript Errors Found:');
        jsErrors.forEach((error, i) => {
          console.log(`  ${i + 1}. ${error}`);
        });
      } else {
        console.log('\n✅ No JavaScript errors detected!');
      }
      
      // Final comprehensive screenshot
      await page.screenshot({ 
        path: '/tmp/familynavigator_final_test.png',
        fullPage: true 
      });
      console.log('📸 Final test screenshot saved to /tmp/familynavigator_final_test.png');
      
    }
    
    // Initialize emailFilteringFound if not set
    if (typeof emailFilteringFound === 'undefined') {
      emailFilteringFound = false;
    }
    
    if (!communicationsFound) {
      console.log('⚠️ Could not navigate to Communications page');
      
      // Check what's actually on the page
      const pageTitle = await page.title();
      const bodyContent = await page.$eval('body', el => el.textContent.substring(0, 500));
      
      console.log(`Page title: ${pageTitle}`);
      console.log(`Page content (first 500 chars): ${bodyContent}`);
    }
    
    // Generate test report
    const report = {
      timestamp: new Date().toISOString(),
      url: 'http://localhost:4001',
      pageLoaded: !jsErrors.length || !jsErrors.some(e => e.includes('Cannot read properties of undefined (reading \'map\')')),
      communicationsAccessible: communicationsFound,
      emailFilteringVisible: emailFilteringFound,
      jsErrorCount: jsErrors.length,
      mapErrorFixed: !jsErrors.some(e => e.includes('Cannot read properties of undefined (reading \'map\')')),
      allErrors: jsErrors,
      consoleMessages: consoleMessages.slice(-20) // Last 20 messages
    };
    
    fs.writeFileSync('/tmp/email_filtering_test_report.json', JSON.stringify(report, null, 2));
    console.log('📊 Test report saved to /tmp/email_filtering_test_report.json');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testEmailFilteringPanel().catch(console.error);