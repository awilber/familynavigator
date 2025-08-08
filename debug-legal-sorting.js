const puppeteer = require('puppeteer');

async function debugLegalSorting() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    defaultViewport: { width: 1400, height: 900 }
  });
  
  const page = await browser.newPage();
  
  // Intercept network requests to see what API calls are made
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (request.url().includes('email-filtering/analysis')) {
      console.log('🌐 API Request:', request.url());
    }
    request.continue();
  });
  
  page.on('response', async (response) => {
    if (response.url().includes('email-filtering/analysis')) {
      console.log('📡 API Response URL:', response.url());
      try {
        const data = await response.json();
        console.log('📊 First 3 emails from API:', 
          data.data?.emails?.slice(0, 3).map(e => ({
            email: e.email_address,
            legal_score: e.legal_importance_score,
            msg_count: e.total_message_count
          })) || 'No data'
        );
      } catch (e) {
        console.log('❌ Could not parse API response');
      }
    }
  });
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.text().includes('API') || msg.text().includes('sort') || msg.text().includes('email')) {
      console.log('BROWSER LOG:', msg.text());
    }
  });
  
  try {
    console.log('🔍 Debugging legal sorting on port 4001...\n');
    
    // Navigate to the app
    await page.goto('http://localhost:4001/communications', { 
      waitUntil: 'networkidle0', 
      timeout: 30000 
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Handle authentication
    const authHandled = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const skipButton = buttons.find(btn => btn.textContent.includes('Skip Sign-In'));
      
      if (skipButton) {
        skipButton.click();
        return true;
      }
      return true;
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Click Legal button and capture detailed state
    console.log('🔄 Clicking Legal button...');
    
    const result = await page.evaluate(() => {
      // Find and click legal button
      const legalButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent.includes('Legal') && !btn.textContent.includes('Legal:')
      );
      
      if (legalButton) {
        legalButton.click();
        return { success: true, clicked: true };
      }
      
      return { success: false, error: 'Legal button not found' };
    });
    
    console.log('👆 Click result:', result);
    
    if (result.success) {
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      // Get detailed DOM analysis
      const domAnalysis = await page.evaluate(() => {
        // Find all text content that might contain email addresses
        const allElements = Array.from(document.querySelectorAll('*')).map(el => {
          const text = el.textContent || '';
          if (text.includes('@') && text.includes('Legal:')) {
            return {
              tagName: el.tagName,
              className: el.className,
              text: text.substring(0, 200),
              hasUBS: text.toLowerCase().includes('ubs'),
              hasAwilber: text.toLowerCase().includes('awilber'),
              hasAlexapowell: text.toLowerCase().includes('alexapowell')
            };
          }
          return null;
        }).filter(Boolean);
        
        const visibleEmails = allElements.slice(0, 8);
        
        return {
          totalElements: allElements.length,
          visibleEmails,
          firstEmailHasUBS: allElements[0]?.hasUBS || false,
          firstEmailText: allElements[0]?.text || 'No emails found',
          hasAwilberInTop5: allElements.slice(0, 5).some(e => e.hasAwilber),
          hasAlexapowellInTop5: allElements.slice(0, 5).some(e => e.hasAlexapowell)
        };
      });
      
      console.log('🔍 DOM Analysis:');
      console.log('   Total email elements found:', domAnalysis.totalElements);
      console.log('   First email contains UBS:', domAnalysis.firstEmailHasUBS);
      console.log('   First email text:', domAnalysis.firstEmailText.substring(0, 100));
      console.log('   awilber in top 5:', domAnalysis.hasAwilberInTop5);
      console.log('   alexapowell in top 5:', domAnalysis.hasAlexapowellInTop5);
      
      if (domAnalysis.firstEmailHasUBS) {
        console.log('❌ PROBLEM CONFIRMED: UBS is showing first instead of awilber/alexapowell');
        console.log('🔧 This suggests the frontend is not using the updated API response');
      }
      
      console.log('\n📋 Visible emails:');
      domAnalysis.visibleEmails.forEach((email, index) => {
        console.log(`   ${index + 1}. ${email.text.substring(0, 80)}...`);
      });
    }
    
    console.log('\n🔧 DEBUGGING COMPLETE - Check the browser network tab for API calls');
    
    // Keep browser open for inspection
    await new Promise(resolve => setTimeout(resolve, 20000));
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await browser.close();
  }
}

debugLegalSorting().catch(console.error);