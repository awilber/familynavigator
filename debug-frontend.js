const puppeteer = require('puppeteer');

async function debugFrontend() {
  const browser = await puppeteer.launch({ headless: false, devtools: true });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  
  console.log('Loading communications page...');
  
  try {
    await page.goto('http://localhost:4003/communications', { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    // Wait for React to potentially load
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Check what's rendered
    const hasReactContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root && root.innerHTML.length > 100;
    });
    
    console.log('React content loaded:', hasReactContent);
    
    if (hasReactContent) {
      // Look for our components
      const elements = await page.evaluate(() => {
        return {
          hasChart: document.querySelector('svg') !== null,
          hasButtons: Array.from(document.querySelectorAll('button')).length,
          hasSync: document.body.textContent.includes('Sync'),
          hasCommunication: document.body.textContent.includes('Communication'),
          hasOverview: document.body.textContent.includes('Overview'),
          pageContent: document.body.textContent.slice(0, 500)
        };
      });
      
      console.log('Frontend Analysis:', elements);
      
      // Try to click a sync button if it exists
      if (elements.hasSync) {
        const buttonClicked = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const syncButton = buttons.find(btn => 
            btn.textContent && btn.textContent.includes('Sync')
          );
          if (syncButton) {
            syncButton.click();
            return true;
          }
          return false;
        });
        
        console.log('✅ SYNC BUTTON CLICKED:', buttonClicked);
        
        if (buttonClicked) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log('✅ BROWSER/CLICK QA PASSED - Sync button functional');
        }
      }
    } else {
      console.log('⚠️ React app not loading - checking for errors...');
      
      // Check network failures
      const failedRequests = [];
      page.on('requestfailed', request => {
        failedRequests.push(request.url());
      });
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      if (failedRequests.length > 0) {
        console.log('Failed requests:', failedRequests);
      }
    }
    
    // Take screenshot for manual verification
    await page.screenshot({ path: 'qa-frontend-screenshot.png', fullPage: true });
    console.log('Screenshot saved: qa-frontend-screenshot.png');
    
  } catch (error) {
    console.error('Debug failed:', error.message);
  }
  
  // Keep browser open for manual inspection
  console.log('Browser kept open for manual inspection...');
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  await browser.close();
}

debugFrontend();