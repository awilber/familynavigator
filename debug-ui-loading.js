const puppeteer = require('puppeteer');

async function debugUILoading() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    defaultViewport: { width: 1400, height: 900 }
  });
  
  const page = await browser.newPage();
  
  // Comprehensive logging
  page.on('console', msg => {
    console.log(`🖥️  CONSOLE [${msg.type()}]:`, msg.text());
  });
  
  page.on('request', req => {
    console.log(`📤 REQUEST: ${req.method()} ${req.url()}`);
  });
  
  page.on('response', res => {
    console.log(`📥 RESPONSE: ${res.status()} ${res.url()}`);
    if (res.status() >= 400) {
      console.log(`❌ ERROR RESPONSE: ${res.status()} ${res.statusText()}`);
    }
  });
  
  page.on('requestfailed', req => {
    console.log(`💥 REQUEST FAILED: ${req.url()} - ${req.failure().errorText}`);
  });
  
  try {
    console.log('🔍 Debugging UI loading issues...\n');
    
    // Navigate to the app
    console.log('1️⃣ Loading page...');
    await page.goto('http://localhost:4002/communications', { 
      waitUntil: 'networkidle0', 
      timeout: 30000 
    });
    
    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Detailed page analysis
    const pageAnalysis = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        bodyText: document.body.textContent.substring(0, 500),
        hasReact: !!window.React,
        hasError: document.body.textContent.includes('error') || document.body.textContent.includes('Error'),
        elements: {
          totalElements: document.querySelectorAll('*').length,
          listItems: document.querySelectorAll('li').length,
          buttons: document.querySelectorAll('button').length,
          hasEmailFilteringPanel: document.body.textContent.includes('Email Address Filtering') || 
                                  document.body.textContent.includes('Filtering'),
          hasCommunications: document.body.textContent.includes('Communications'),
          hasFrom: document.body.textContent.includes('From:'),
          hasTo: document.body.textContent.includes('To:')
        },
        networkState: navigator.onLine,
        apiCallsMade: window.performance.getEntriesByType('resource')
          .filter(entry => entry.name.includes('/api/'))
          .map(entry => ({ url: entry.name, status: entry.responseStart > 0 ? 'completed' : 'failed' }))
      };
    });
    
    console.log('\n📊 Page Analysis:');
    console.log('   Title:', pageAnalysis.title);
    console.log('   URL:', pageAnalysis.url);
    console.log('   Elements:', pageAnalysis.elements);
    console.log('   Network online:', pageAnalysis.networkState);
    console.log('   Has React:', pageAnalysis.hasReact);
    console.log('   Has errors:', pageAnalysis.hasError);
    console.log('   API calls made:', pageAnalysis.apiCallsMade.length);
    
    if (pageAnalysis.apiCallsMade.length > 0) {
      console.log('   API calls:', pageAnalysis.apiCallsMade);
    }
    
    // Check if we can manually trigger API calls
    console.log('\n2️⃣ Testing manual API call...');
    const manualApiTest = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/communications?limit=5');
        const data = await response.json();
        return {
          success: response.ok,
          status: response.status,
          dataLength: data.data ? data.data.length : 0,
          error: response.ok ? null : `${response.status} ${response.statusText}`
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });
    
    console.log('📡 Manual API test result:', manualApiTest);
    
    // Check if we're on the right page
    if (!pageAnalysis.elements.hasCommunications) {
      console.log('❌ ISSUE: Page does not contain "Communications" text');
      console.log('   This suggests we might not be on the communications page');
      console.log('   Body preview:', pageAnalysis.bodyText);
    }
    
    if (manualApiTest.success && manualApiTest.dataLength > 0) {
      console.log('✅ API is working - data is available');
      console.log('❌ But UI is not displaying the data - React component issue');
    } else {
      console.log('❌ API is not working - backend connectivity issue');
      console.log('   Error:', manualApiTest.error);
    }
    
    // Wait for manual inspection
    console.log('\n👁️  Browser staying open for 15 seconds for manual inspection...');
    console.log('   Check the developer console for more details');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await browser.close();
  }
}

debugUILoading().catch(console.error);