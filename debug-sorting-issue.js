const puppeteer = require('puppeteer');

async function debugSortingIssue() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    defaultViewport: { width: 1400, height: 900 }
  });
  
  const page = await browser.newPage();
  
  // Capture console messages
  page.on('console', msg => {
    if (msg.text().includes('[DEBUG]') || msg.text().includes('sort') || msg.text().includes('email')) {
      console.log('BROWSER:', msg.text());
    }
  });
  
  try {
    console.log('🔍 Debugging sorting issue...\n');
    
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
    
    // Function to get current email order in UI
    const getCurrentEmailOrder = async () => {
      return await page.evaluate(() => {
        const emailElements = Array.from(document.querySelectorAll('*')).filter(el => {
          const text = el.textContent;
          return text.includes('@') && text.includes('msgs') && 
                 !text.includes('From:') && !text.includes('Subject:') &&
                 text.length > 20 && text.length < 500;
        });
        
        return emailElements.slice(0, 5).map((el, index) => {
          const text = el.textContent;
          const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          const msgMatch = text.match(/(\d+)\s+msgs/);
          const legalMatch = text.match(/Legal:\s+(\d+)\/10/);
          
          return {
            position: index + 1,
            email: emailMatch ? emailMatch[1] : 'no-email-found',
            messageCount: msgMatch ? parseInt(msgMatch[1]) : 0,
            legalScore: legalMatch ? parseInt(legalMatch[1]) : 0
          };
        });
      });
    };
    
    // Test 1: Check initial frequency order
    console.log('📊 Initial state (should be frequency):');
    const initialOrder = await getCurrentEmailOrder();
    initialOrder.forEach(item => {
      console.log(`  ${item.position}. ${item.email} (${item.messageCount} msgs, Legal: ${item.legalScore})`);
    });
    
    // Test 2: Click Recent button
    console.log('\n🕒 Clicking Recent button...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const recentButton = buttons.find(btn => btn.textContent.includes('Recent') && !btn.textContent.includes('ago'));
      if (recentButton) recentButton.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    const afterRecent = await getCurrentEmailOrder();
    console.log('After Recent sort:');
    afterRecent.forEach(item => {
      console.log(`  ${item.position}. ${item.email} (${item.messageCount} msgs, Legal: ${item.legalScore})`);
    });
    
    // Check if order actually changed
    const recentOrderChanged = JSON.stringify(initialOrder) !== JSON.stringify(afterRecent);
    console.log(`Order changed after Recent click: ${recentOrderChanged}`);
    
    // Test 3: Click Frequency button
    console.log('\n📈 Clicking Frequency button...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const freqButton = buttons.find(btn => btn.textContent.includes('Frequency'));
      if (freqButton) freqButton.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    const afterFrequency = await getCurrentEmailOrder();
    console.log('After Frequency sort:');
    afterFrequency.forEach(item => {
      console.log(`  ${item.position}. ${item.email} (${item.messageCount} msgs, Legal: ${item.legalScore})`);
    });
    
    const frequencyOrderChanged = JSON.stringify(afterRecent) !== JSON.stringify(afterFrequency);
    console.log(`Order changed after Frequency click: ${frequencyOrderChanged}`);
    
    // Test 4: Click Legal button (we know this works)
    console.log('\n⚖️ Clicking Legal button...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const legalButton = buttons.find(btn => btn.textContent.includes('Legal') && !btn.textContent.includes('Legal:'));
      if (legalButton) legalButton.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    const afterLegal = await getCurrentEmailOrder();
    console.log('After Legal sort:');
    afterLegal.forEach(item => {
      console.log(`  ${item.position}. ${item.email} (${item.messageCount} msgs, Legal: ${item.legalScore})`);
    });
    
    const legalOrderChanged = JSON.stringify(afterFrequency) !== JSON.stringify(afterLegal);
    console.log(`Order changed after Legal click: ${legalOrderChanged}`);
    
    console.log('\n🔍 ANALYSIS:');
    console.log(`  Recent sorting working: ${recentOrderChanged}`);
    console.log(`  Frequency sorting working: ${frequencyOrderChanged}`);
    console.log(`  Legal sorting working: ${legalOrderChanged}`);
    
    if (!recentOrderChanged || !frequencyOrderChanged) {
      console.log('\n❌ Issue confirmed: Some sorting buttons not changing order');
      console.log('This suggests frontend state management or render issue');
    }
    
    await new Promise(resolve => setTimeout(resolve, 15000));
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await browser.close();
  }
}

debugSortingIssue().catch(console.error);