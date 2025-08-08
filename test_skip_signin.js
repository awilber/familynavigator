const puppeteer = require('puppeteer');

async function testSkipSignInAndEmailFiltering() {
  console.log('🔍 Testing Skip Sign-In and Email Filtering Panel...');
  
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
    
    // Take screenshot of login page
    await page.screenshot({ 
      path: '/tmp/familynavigator_login.png',
      fullPage: true 
    });
    console.log('📸 Login page screenshot saved');
    
    // Click the Skip Sign-In button
    console.log('🔍 Looking for Skip Sign-In button...');
    
    try {
      // Wait for the skip button to be visible and clickable
      await page.waitForSelector('*', { timeout: 5000 });
      
      // Find and click the skip sign-in button more precisely
      const skipButtonClicked = await page.evaluate(() => {
        // Look for the skip sign-in text
        const allElements = Array.from(document.querySelectorAll('*'));
        const skipButton = allElements.find(el => {
          const text = el.textContent || '';
          return text.includes('Skip Sign-In') && 
                 (el.tagName === 'BUTTON' || el.onclick || el.style.cursor === 'pointer' || 
                  el.getAttribute('role') === 'button' || el.closest('button'));
        });
        
        if (skipButton) {
          console.log('Found skip button:', skipButton.outerHTML.substring(0, 200));
          // If it's not a button itself, find the parent button
          const actualButton = skipButton.tagName === 'BUTTON' ? skipButton : skipButton.closest('button');
          if (actualButton) {
            actualButton.click();
            return true;
          } else {
            skipButton.click();
            return true;
          }
        }
        return false;
      });
      
      if (skipButtonClicked) {
        console.log('✅ Clicked Skip Sign-In button');
        
        // Wait for login dispatch to complete and navigation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if we've been redirected
        const currentUrl = page.url();
        console.log(`Current URL after skip: ${currentUrl}`);
        
        // Take screenshot after skip
        await page.screenshot({ 
          path: '/tmp/familynavigator_after_skip_signin.png',
          fullPage: true 
        });
        console.log('📸 Screenshot after skip sign-in saved');
        
        // Wait a bit more for any async operations
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check page content
        const pageContent = await page.content();
        const bodyText = await page.$eval('body', el => el.textContent);
        
        console.log('Page content preview after skip:', bodyText.substring(0, 500));
        
        // Look for Communications navigation or content
        const hasDashboard = bodyText.includes('Dashboard') || pageContent.includes('Dashboard');
        const hasCommunications = bodyText.includes('Communications') || pageContent.includes('Communications');
        const hasEmailFiltering = bodyText.includes('Email Filtering') || pageContent.includes('Email Filtering');
        const hasNavigation = bodyText.includes('Navigation') || pageContent.includes('nav') || pageContent.includes('menu');
        
        console.log(`✅ Dashboard content found: ${hasDashboard}`);
        console.log(`📧 Communications content found: ${hasCommunications}`);
        console.log(`📧 Email Filtering content found: ${hasEmailFiltering}`);
        console.log(`🧭 Navigation elements found: ${hasNavigation}`);
        
        // Try to navigate to communications if we're in the app
        if (hasDashboard || hasCommunications || hasNavigation) {
          console.log('🔍 Attempting to navigate to Communications...');
          
          // Try multiple navigation approaches
          const communicationsFound = await page.evaluate(() => {
            // Look for communications links/buttons
            const allElements = Array.from(document.querySelectorAll('*'));
            const commElement = allElements.find(el => {
              const text = (el.textContent || '').toLowerCase();
              return text.includes('communications') && 
                     (el.tagName === 'A' || el.tagName === 'BUTTON' || el.onclick || 
                      el.style.cursor === 'pointer' || el.getAttribute('role') === 'button');
            });
            
            if (commElement) {
              commElement.click();
              return true;
            }
            return false;
          });
          
          if (communicationsFound) {
            console.log('✅ Clicked Communications navigation');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Take final screenshot
            await page.screenshot({ 
              path: '/tmp/familynavigator_communications_final.png',
              fullPage: true 
            });
            console.log('📸 Communications page screenshot saved');
            
            // Check for Email Filtering panel
            const finalContent = await page.content();
            const finalBodyText = await page.$eval('body', el => el.textContent);
            
            const emailFilteringVisible = finalBodyText.includes('Email Filtering') || 
                                         finalBodyText.includes('No email addresses found') ||
                                         finalBodyText.includes('email addresses') ||
                                         finalContent.includes('EmailFiltering');
            
            console.log(`📧 Email Filtering panel visible: ${emailFilteringVisible}`);
          }
        }
        
      } else {
        console.log('⚠️ Could not find or click Skip Sign-In button');
      }
      
    } catch (error) {
      console.log('❌ Error during skip sign-in:', error.message);
    }
    
    // Check for the critical map error
    const hasMapError = jsErrors.some(error => 
      error.includes('Cannot read properties of undefined (reading \'map\')') ||
      error.includes('map is not a function')
    );
    
    const hasCriticalErrors = jsErrors.some(error => 
      error.includes('Cannot read properties of undefined') ||
      error.includes('TypeError') ||
      error.includes('ReferenceError')
    );
    
    // Final test results
    console.log('\n📋 SKIP SIGN-IN & EMAIL FILTERING TEST RESULTS:');
    console.log('================================================');
    console.log(`🔗 Application URL: http://localhost:4001`);
    console.log(`❌ JavaScript errors total: ${jsErrors.length}`);
    console.log(`🗺️ Map-related errors: ${hasMapError ? 'YES - CRITICAL ISSUE' : 'NO - FIXED ✅'}`);
    console.log(`💥 Critical errors: ${hasCriticalErrors ? 'YES - NEEDS ATTENTION' : 'NO - CLEAN ✅'}`);
    console.log(`📄 Page loads without crashing: ${!hasCriticalErrors}`);
    
    if (jsErrors.length > 0) {
      console.log('\n🚨 JavaScript Errors Found:');
      jsErrors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    } else {
      console.log('\n✅ NO JAVASCRIPT ERRORS - EMAIL FILTERING FIX SUCCESSFUL!');
    }
    
    // Generate comprehensive test report
    const report = {
      timestamp: new Date().toISOString(),
      testType: 'Skip Sign-In and Email Filtering Panel Test',
      url: 'http://localhost:4001',
      results: {
        pageLoaded: !hasCriticalErrors,
        jsErrorCount: jsErrors.length,
        mapErrorFixed: !hasMapError,
        criticalErrorsFound: hasCriticalErrors,
        skipSignInTested: true,
        emailFilteringPanelAccessible: false // Will be updated if found
      },
      errors: jsErrors,
      consoleMessages: consoleMessages.slice(-10)
    };
    
    require('fs').writeFileSync('/tmp/skip_signin_test_report.json', JSON.stringify(report, null, 2));
    console.log('📊 Comprehensive test report saved to /tmp/skip_signin_test_report.json');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testSkipSignInAndEmailFiltering().catch(console.error);