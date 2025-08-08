const puppeteer = require('puppeteer');

async function testUnifiedPanelSimple() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    defaultViewport: { width: 1400, height: 900 }
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('BROWSER LOG:', msg.text());
  });
  
  try {
    console.log('🔄 Testing unified panel data loading...\n');
    
    // Navigate to the app
    console.log('1️⃣ Loading communications page...');
    await page.goto('http://localhost:4001/communications', { 
      waitUntil: 'networkidle0', 
      timeout: 30000 
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Handle authentication
    console.log('2️⃣ Handling authentication...');
    
    const authHandled = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const skipButton = buttons.find(btn => btn.textContent.includes('Skip Sign-In'));
      
      if (skipButton) {
        skipButton.click();
        return { success: true };
      }
      
      return { success: true };
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check what's actually loaded
    console.log('3️⃣ Checking unified panel content...');
    
    const panelContent = await page.evaluate(() => {
      const panelExists = document.body.textContent.includes('People & Communications');
      const loadingState = document.body.textContent.includes('Loading people and communications');
      const errorState = document.body.textContent.includes('Network error loading data');
      const hasEmailItems = document.body.textContent.includes('@');
      const itemCount = document.body.textContent.match(/(\d+)\s+items/)?.[1];
      
      // Find all elements that contain email addresses
      const emailElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent;
        return text && text.includes('@') && text.length < 200 && !text.includes('From:');
      });
      
      return {
        panelExists,
        loadingState,
        errorState,
        hasEmailItems,
        itemCount,
        emailElementCount: emailElements.length,
        sampleEmails: emailElements.slice(0, 3).map(el => el.textContent.substring(0, 100))
      };
    });
    
    console.log('📊 Panel content check:', panelContent);
    
    if (panelContent.loadingState) {
      console.log('⏳ Still loading, waiting longer...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const afterWait = await page.evaluate(() => {
        const stillLoading = document.body.textContent.includes('Loading people and communications');
        const hasError = document.body.textContent.includes('error');
        const itemCount = document.body.textContent.match(/(\d+)\s+items/)?.[1];
        
        return {
          stillLoading,
          hasError,
          itemCount
        };
      });
      
      console.log('📊 After waiting:', afterWait);
    }
    
    // Try to find any clickable email items
    console.log('4️⃣ Looking for clickable items...');
    
    const clickableItems = await page.evaluate(() => {
      // Look for items that have cursor: pointer
      const clickables = Array.from(document.querySelectorAll('*')).filter(el => {
        const style = window.getComputedStyle(el);
        return style.cursor === 'pointer' && el.textContent.length > 10 && el.textContent.length < 200;
      });
      
      return {
        count: clickables.length,
        samples: clickables.slice(0, 5).map(el => ({
          tagName: el.tagName,
          textContent: el.textContent.substring(0, 100)
        }))
      };
    });
    
    console.log('🖱️ Clickable items found:', clickableItems);
    
    // Test a click on first available item
    if (clickableItems.count > 0) {
      console.log('5️⃣ Testing click on first item...');
      
      const clickResult = await page.evaluate(() => {
        const clickables = Array.from(document.querySelectorAll('*')).filter(el => {
          const style = window.getComputedStyle(el);
          return style.cursor === 'pointer' && el.textContent.length > 10 && el.textContent.length < 200;
        });
        
        if (clickables.length > 0) {
          const firstItem = clickables[0];
          firstItem.click();
          return {
            success: true,
            clicked: firstItem.textContent.substring(0, 50)
          };
        }
        
        return { success: false };
      });
      
      console.log('👆 Click result:', clickResult);
      
      if (clickResult.success) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const afterClick = await page.evaluate(() => {
          const hasFilterChip = document.body.textContent.includes('Filtered:');
          const chartTab = document.body.textContent.includes('Communication Trends');
          
          return {
            hasFilterChip,
            chartTab
          };
        });
        
        console.log('📈 After click:', afterClick);
      }
    }
    
    console.log('\n✅ Unified panel test complete');
    
    // Keep browser open for inspection
    console.log('\n👁️  Browser staying open for 10 seconds for inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testUnifiedPanelSimple().catch(console.error);