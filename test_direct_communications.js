const puppeteer = require('puppeteer');

async function testDirectCommunications() {
  console.log('🔍 Testing Direct Communications Route...');
  
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
    
    // Try different possible communications routes
    const routesToTest = [
      'http://localhost:4001/communications',
      'http://localhost:4001/#/communications',
      'http://localhost:4001/dashboard',
      'http://localhost:4001/#/dashboard'
    ];
    
    for (const route of routesToTest) {
      console.log(`\n📖 Testing route: ${route}`);
      
      try {
        await page.goto(route, { 
          waitUntil: 'networkidle2',
          timeout: 15000 
        });
        
        // Wait for React to render
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Take screenshot
        const routeName = route.split('/').pop() || 'root';
        await page.screenshot({ 
          path: `/tmp/familynavigator_${routeName}.png`,
          fullPage: true 
        });
        console.log(`📸 Screenshot saved for ${route}`);
        
        // Check page content
        const pageContent = await page.content();
        const pageTitle = await page.title();
        
        console.log(`Page title: ${pageTitle}`);
        
        // Look for Email Filtering content
        const hasEmailFiltering = pageContent.includes('Email Filtering') || 
                                 pageContent.includes('email filtering') || 
                                 pageContent.includes('No email addresses found') ||
                                 pageContent.includes('EmailFiltering');
        
        const hasCommunications = pageContent.includes('Communications') ||
                                 pageContent.includes('communications') ||
                                 pageContent.includes('Messages') ||
                                 pageContent.includes('Emails');
        
        console.log(`Contains Communications content: ${hasCommunications}`);
        console.log(`Contains Email Filtering content: ${hasEmailFiltering}`);
        
        // Check for specific error patterns
        const hasMapError = jsErrors.some(error => 
          error.includes('Cannot read properties of undefined (reading \'map\')') ||
          error.includes('map is not a function')
        );
        
        console.log(`JavaScript errors: ${jsErrors.length}`);
        console.log(`Map-related errors: ${hasMapError ? 'YES - CRITICAL' : 'NO - FIXED'}`);
        
        // If we found either communications or email filtering content, this route works
        if (hasCommunications || hasEmailFiltering) {
          console.log(`✅ Route ${route} shows relevant content!`);
          
          // Look for specific elements
          const bodyText = await page.$eval('body', el => el.textContent);
          console.log('Page content preview:', bodyText.substring(0, 500));
          
          break;
        } else {
          console.log(`⚠️ Route ${route} doesn't show expected content`);
        }
        
      } catch (error) {
        console.log(`❌ Route ${route} failed: ${error.message}`);
      }
    }
    
    // Final summary
    console.log('\n📋 DIRECT ROUTE TEST RESULTS:');
    console.log('==============================');
    console.log(`🔗 Base URL: http://localhost:4001`);
    console.log(`❌ JavaScript errors total: ${jsErrors.length}`);
    console.log(`🗺️ Map-related errors: ${jsErrors.some(e => e.includes('map')) ? 'YES - NEEDS FIX' : 'NO - FIXED'}`);
    console.log(`📄 Page loads without crashing: ${jsErrors.length === 0 || !jsErrors.some(e => e.includes('Cannot read properties of undefined'))}`);
    
    if (jsErrors.length > 0) {
      console.log('\n🚨 JavaScript Errors Found:');
      jsErrors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    } else {
      console.log('\n✅ No JavaScript errors detected - Email Filtering fix appears successful!');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testDirectCommunications().catch(console.error);