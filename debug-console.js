const puppeteer = require('puppeteer');

async function debugConsole() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    defaultViewport: { width: 1400, height: 900 }
  });
  
  const page = await browser.newPage();
  
  // Capture console messages
  page.on('console', msg => {
    console.log('BROWSER:', msg.text());
  });
  
  try {
    console.log('🔄 Opening app with console monitoring...\n');
    
    await page.goto('http://localhost:4001/communications', { 
      waitUntil: 'networkidle0', 
      timeout: 30000 
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Skip auth
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const skipButton = buttons.find(btn => btn.textContent.includes('Skip Sign-In'));
      if (skipButton) skipButton.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('📊 Clicking Legal button to trigger debugging...');
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const legalButton = buttons.find(btn => btn.textContent.includes('Legal') && !btn.textContent.includes('Legal:'));
      if (legalButton) {
        console.log('[DEBUG] Clicking Legal button');
        legalButton.click();
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    console.log('\n🔄 Clicking Frequency to compare...');
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const freqButton = buttons.find(btn => btn.textContent.includes('Frequency'));
      if (freqButton) {
        console.log('[DEBUG] Clicking Frequency button');
        freqButton.click();
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    console.log('\n👁️  Browser staying open for 20 seconds...');
    await new Promise(resolve => setTimeout(resolve, 20000));
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await browser.close();
  }
}

debugConsole().catch(console.error);