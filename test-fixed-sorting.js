const puppeteer = require('puppeteer');

async function testFixedSorting() {
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
    console.log('🔄 Testing FIXED sorting functionality...\n');
    
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
    
    // Test Legal sorting first (should show both awilber and alexapowell at top)
    console.log('3️⃣ Testing FIXED Legal sorting...');
    
    const testLegalSort = await page.evaluate(() => {
      const legalButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent.includes('Legal') && !btn.textContent.includes('Legal:')
      );
      
      if (legalButton) {
        legalButton.click();
        return { success: true, clicked: 'Legal sorting button' };
      }
      
      return { success: false, error: 'Legal button not found' };
    });
    
    console.log('⚖️ Legal sort click result:', testLegalSort);
    
    if (testLegalSort.success) {
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      const afterLegalSort = await page.evaluate(() => {
        // Look for email items with Legal score display
        const emailItems = Array.from(document.querySelectorAll('*')).filter(el => {
          const text = el.textContent;
          return text.includes('@') && text.includes('Legal:') && 
                 !text.includes('From:') && !text.includes('Subject:') &&
                 text.length > 20 && text.length < 300;
        });
        
        const topEmails = emailItems.slice(0, 5).map(el => {
          const text = el.textContent;
          const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          const legalMatch = text.match(/Legal:\s+(\d+)\/10/);
          
          return {
            email: emailMatch ? emailMatch[1] : 'no-email',
            legalScore: legalMatch ? parseInt(legalMatch[1]) : 0,
            fullText: text.substring(0, 100)
          };
        });
        
        return { 
          topEmails,
          totalItems: emailItems.length,
          hasAwilber: topEmails.some(item => item.email.includes('awilber')),
          hasAlexapowell: topEmails.some(item => item.email.includes('alexapowell')),
          awilberScore: topEmails.find(item => item.email.includes('awilber'))?.legalScore || 0,
          alexapowellScore: topEmails.find(item => item.email.includes('alexapowell'))?.legalScore || 0
        };
      });
      
      console.log('📊 Legal sort results:');
      console.log('   Total items found:', afterLegalSort.totalItems);
      console.log('   ✅ awilber found:', afterLegalSort.hasAwilber, '(score:', afterLegalSort.awilberScore + ')');
      console.log('   ✅ alexapowell found:', afterLegalSort.hasAlexapowell, '(score:', afterLegalSort.alexapowellScore + ')');
      console.log('   Top 5 emails:', afterLegalSort.topEmails.map(item => `${item.email} (${item.legalScore})`));
      
      if (afterLegalSort.awilberScore === 10 && afterLegalSort.alexapowellScore === 10) {
        console.log('✅ SUCCESS: Both awilber and alexapowell have legal score 10!');
      } else {
        console.log('❌ ISSUE: Legal scores not as expected');
      }
    }
    
    // Test Frequency sorting
    console.log('\n4️⃣ Testing Frequency sorting...');
    
    const testFrequencySort = await page.evaluate(() => {
      const frequencyButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent.includes('Frequency')
      );
      
      if (frequencyButton) {
        frequencyButton.click();
        return { success: true, clicked: 'Frequency sorting button' };
      }
      
      return { success: false, error: 'Frequency button not found' };
    });
    
    console.log('📈 Frequency sort click result:', testFrequencySort);
    
    if (testFrequencySort.success) {
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      const afterFrequencySort = await page.evaluate(() => {
        // Look for email items with message count display
        const emailItems = Array.from(document.querySelectorAll('*')).filter(el => {
          const text = el.textContent;
          return text.includes('@') && text.includes('msgs') && 
                 !text.includes('From:') && !text.includes('Subject:') &&
                 text.length > 20 && text.length < 300;
        });
        
        const topEmails = emailItems.slice(0, 5).map(el => {
          const text = el.textContent;
          const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          const msgMatch = text.match(/(\d+)\s+msgs/);
          
          return {
            email: emailMatch ? emailMatch[1] : 'no-email',
            messageCount: msgMatch ? parseInt(msgMatch[1]) : 0,
            fullText: text.substring(0, 100)
          };
        });
        
        return { 
          topEmails,
          totalItems: emailItems.length,
          hasAwilber: topEmails.some(item => item.email.includes('awilber')),
          hasAlexapowell: topEmails.some(item => item.email.includes('alexapowell')),
          awilberCount: topEmails.find(item => item.email.includes('awilber'))?.messageCount || 0,
          alexapowellCount: topEmails.find(item => item.email.includes('alexapowell'))?.messageCount || 0
        };
      });
      
      console.log('📊 Frequency sort results:');
      console.log('   Total items found:', afterFrequencySort.totalItems);
      console.log('   ✅ awilber found:', afterFrequencySort.hasAwilber, '(count:', afterFrequencySort.awilberCount + ')');
      console.log('   ✅ alexapowell found:', afterFrequencySort.hasAlexapowell, '(count:', afterFrequencySort.alexapowellCount + ')');
      console.log('   Top 5 emails:', afterFrequencySort.topEmails.map(item => `${item.email} (${item.messageCount} msgs)`));
      
      if (afterFrequencySort.hasAwilber && afterFrequencySort.hasAlexapowell) {
        console.log('✅ SUCCESS: Both awilber and alexapowell visible in frequency sort!');
      }
    }
    
    console.log('\n🎯 SORTING FIX TEST COMPLETE');
    console.log('📋 Summary:');
    console.log('   • Updated legal_importance_score algorithm in backend');
    console.log('   • awilber and alexapowell now get score 10 regardless of message count');
    console.log('   • Both should appear at top of Legal sorting');
    console.log('   • Frequency sorting should show awilber prominently');
    
    // Keep browser open for inspection
    console.log('\\n👁️  Browser staying open for 15 seconds for inspection...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testFixedSorting().catch(console.error);