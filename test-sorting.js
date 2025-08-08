const puppeteer = require('puppeteer');

async function testSortingFunctionality() {
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
    console.log('🔄 Testing sorting functionality...\n');
    
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
    
    // Test different sorting modes
    console.log('3️⃣ Testing Frequency sorting...');
    
    const testFrequencySort = await page.evaluate(() => {
      const frequencyButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent.includes('Frequency')
      );
      
      if (frequencyButton) {
        // Check initial state
        const beforeClick = {
          isActive: frequencyButton.getAttribute('class').includes('MuiButton-contained'),
          topEmailsBefore: Array.from(document.querySelectorAll('*')).filter(el => {
            const text = el.textContent;
            return text.includes('@') && text.includes('msgs') && !text.includes('From:') && !text.includes('Subject:');
          }).slice(0, 3).map(el => {
            const text = el.textContent;
            const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            return emailMatch ? emailMatch[1] : 'no-email-found';
          })
        };
        
        frequencyButton.click();
        
        return {
          success: true,
          beforeClick
        };
      }
      
      return { success: false, error: 'Frequency button not found' };
    });
    
    console.log('📊 Frequency sort test:', testFrequencySort);
    
    if (testFrequencySort.success) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const afterFrequencySort = await page.evaluate(() => {
        const topEmailsAfter = Array.from(document.querySelectorAll('*')).filter(el => {
          const text = el.textContent;
          return text.includes('@') && text.includes('msgs') && !text.includes('From:') && !text.includes('Subject:');
        }).slice(0, 5).map(el => {
          const text = el.textContent;
          const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          const msgMatch = text.match(/(\d+)\s+msgs/);
          return {
            email: emailMatch ? emailMatch[1] : 'no-email-found',
            messageCount: msgMatch ? parseInt(msgMatch[1]) : 0
          };
        });
        
        return { topEmailsAfter };
      });
      
      console.log('📈 Top emails after frequency sort:', afterFrequencySort.topEmailsAfter);
      
      // Check if awilber and alexapowell are in top results
      const hasAwilber = afterFrequencySort.topEmailsAfter.some(item => item.email.includes('awilber'));
      const hasAlexapowell = afterFrequencySort.topEmailsAfter.some(item => item.email.includes('alexapowell'));
      
      console.log('✅ Contains awilber:', hasAwilber);
      console.log('✅ Contains alexapowell:', hasAlexapowell);
    }
    
    // Test Legal sorting
    console.log('\n4️⃣ Testing Legal sorting...');
    
    const testLegalSort = await page.evaluate(() => {
      const legalButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent.includes('Legal')
      );
      
      if (legalButton) {
        legalButton.click();
        return { success: true };
      }
      
      return { success: false, error: 'Legal button not found' };
    });
    
    console.log('📊 Legal sort test:', testLegalSort);
    
    if (testLegalSort.success) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const afterLegalSort = await page.evaluate(() => {
        const topEmailsAfter = Array.from(document.querySelectorAll('*')).filter(el => {
          const text = el.textContent;
          return text.includes('@') && text.includes('Legal:') && !text.includes('From:') && !text.includes('Subject:');
        }).slice(0, 5).map(el => {
          const text = el.textContent;
          const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          const legalMatch = text.match(/Legal:\s+(\d+)\/10/);
          return {
            email: emailMatch ? emailMatch[1] : 'no-email-found',
            legalScore: legalMatch ? parseInt(legalMatch[1]) : 0
          };
        });
        
        return { topEmailsAfter };
      });
      
      console.log('⚖️ Top emails after legal sort:', afterLegalSort.topEmailsAfter);
      
      // Check if awilber and alexapowell are in top results
      const hasAwilber = afterLegalSort.topEmailsAfter.some(item => item.email.includes('awilber'));
      const hasAlexapowell = afterLegalSort.topEmailsAfter.some(item => item.email.includes('alexapowell'));
      
      console.log('✅ Contains awilber:', hasAwilber);
      console.log('✅ Contains alexapowell:', hasAlexapowell);
    }
    
    // Test Recent sorting
    console.log('\n5️⃣ Testing Recent sorting...');
    
    const testRecentSort = await page.evaluate(() => {
      const recentButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent.includes('Recent')
      );
      
      if (recentButton) {
        recentButton.click();
        return { success: true };
      }
      
      return { success: false, error: 'Recent button not found' };
    });
    
    console.log('📊 Recent sort test:', testRecentSort);
    
    if (testRecentSort.success) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const afterRecentSort = await page.evaluate(() => {
        const topEmailsAfter = Array.from(document.querySelectorAll('*')).filter(el => {
          const text = el.textContent;
          return text.includes('@') && (text.includes('ago') || text.includes('Today') || text.includes('Yesterday')) && 
                 !text.includes('From:') && !text.includes('Subject:');
        }).slice(0, 5).map(el => {
          const text = el.textContent;
          const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          const timeMatch = text.match(/(Today|Yesterday|\d+\s+days?\s+ago|\d+\s+weeks?\s+ago)/);
          return {
            email: emailMatch ? emailMatch[1] : 'no-email-found',
            timeIndicator: timeMatch ? timeMatch[1] : 'no-time-found'
          };
        });
        
        return { topEmailsAfter };
      });
      
      console.log('🕒 Top emails after recent sort:', afterRecentSort.topEmailsAfter);
      
      // Check if awilber and alexapowell are in top results
      const hasAwilber = afterRecentSort.topEmailsAfter.some(item => item.email.includes('awilber'));
      const hasAlexapowell = afterRecentSort.topEmailsAfter.some(item => item.email.includes('alexapowell'));
      
      console.log('✅ Contains awilber:', hasAwilber);
      console.log('✅ Contains alexapowell:', hasAlexapowell);
    }
    
    console.log('\n🎯 SORTING TEST COMPLETE');
    
    // Keep browser open for inspection
    console.log('\n👁️  Browser staying open for 15 seconds for inspection...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testSortingFunctionality().catch(console.error);