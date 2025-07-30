#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testSkipSignin() {
  console.log('🔍 Starting Skip Sign-In QA Verification');
  console.log('=====================================');

  let browser;
  try {
    // Launch headless browser
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });

    console.log('📍 Navigating to http://localhost:3011...');
    
    // Navigate to the frontend
    const response = await page.goto('http://localhost:3011', { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });

    if (!response.ok()) {
      throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
    }

    console.log('✅ Page loaded successfully');

    // Wait for React to render
    await page.waitForTimeout(2000);

    // Take a screenshot
    await page.screenshot({ 
      path: '/Users/arlonwilber/Library/CloudStorage/GoogleDrive-awilber@wiredtriangle.com/Shared drives/AW/Personal/Projects/familynavigator/login-page-screenshot.png',
      fullPage: true 
    });
    console.log('📸 Screenshot saved: login-page-screenshot.png');

    // Check if we're in development mode by looking for the skip signin link
    const skipSigninExists = await page.evaluate(() => {
      const skipButton = Array.from(document.querySelectorAll('*')).find(el => 
        el.textContent && el.textContent.includes('Skip Sign-In')
      );
      return !!skipButton;
    });

    console.log(`🔍 Skip Sign-In link present: ${skipSigninExists ? '✅ YES' : '❌ NO'}`);

    if (skipSigninExists) {
      // Test skip signin functionality
      console.log('🧪 Testing Skip Sign-In functionality...');
      
      const skipButton = await page.evaluateHandle(() => {
        return Array.from(document.querySelectorAll('*')).find(el => 
          el.textContent && el.textContent.includes('Skip Sign-In')
        );
      });

      if (skipButton) {
        await skipButton.click();
        console.log('🖱️  Clicked Skip Sign-In button');

        // Wait for navigation/state change
        await page.waitForTimeout(1000);

        // Check if we're now on the dashboard or authenticated view
        const isAuthenticated = await page.evaluate(() => {
          // Look for dashboard indicators
          return document.body.textContent.includes('Dashboard') || 
                 document.body.textContent.includes('Family Navigator') ||
                 document.URL.includes('dashboard');
        });

        console.log(`🔐 Authentication bypass successful: ${isAuthenticated ? '✅ YES' : '❌ NO'}`);

        if (isAuthenticated) {
          await page.screenshot({ 
            path: '/Users/arlonwilber/Library/CloudStorage/GoogleDrive-awilber@wiredtriangle.com/Shared drives/AW/Personal/Projects/familynavigator/dashboard-screenshot.png',
            fullPage: true 
          });
          console.log('📸 Dashboard screenshot saved: dashboard-screenshot.png');
        }
      }
    }

    // Check for development warning text
    const warningText = await page.evaluate(() => {
      const warning = Array.from(document.querySelectorAll('*')).find(el => 
        el.textContent && el.textContent.includes('Development only')
      );
      return warning ? warning.textContent : null;
    });

    console.log(`⚠️  Development warning text: ${warningText ? '✅ FOUND' : '❌ NOT FOUND'}`);
    if (warningText) {
      console.log(`   Warning: "${warningText}"`);
    }

    console.log('\n📊 QA VERIFICATION RESULTS:');
    console.log('============================');
    console.log(`Frontend accessible: ✅ YES`);
    console.log(`Skip Sign-In visible: ${skipSigninExists ? '✅ YES' : '❌ NO'}`);
    console.log(`Development warning: ${warningText ? '✅ YES' : '❌ NO'}`);
    console.log(`Authentication bypass: ${skipSigninExists ? '✅ TESTED' : '❌ NOT TESTED'}`);

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testSkipSignin().catch(console.error);