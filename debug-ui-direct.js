const puppeteer = require('puppeteer');

async function debugUIDirect() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    defaultViewport: { width: 1400, height: 900 }
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('🔄 Direct UI debugging...\n');
    
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
    
    console.log('📊 Checking current UI state...');
    
    const initialState = await page.evaluate(() => {
      // Find all email elements
      const elements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent;
        return text.includes('@') && text.includes('Legal:') && text.length < 500;
      });
      
      return {
        totalFound: elements.length,
        firstFiveEmails: elements.slice(0, 5).map(el => {
          const text = el.textContent;
          const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          const legalMatch = text.match(/Legal:\s+(\d+)\/10/);
          return {
            email: emailMatch ? emailMatch[1] : 'no-match',
            legalScore: legalMatch ? parseInt(legalMatch[1]) : 0,
            isUBS: text.toLowerCase().includes('ubs'),
            isAwilber: text.toLowerCase().includes('awilber'),
            isAlexapowell: text.toLowerCase().includes('alexapowell')
          };
        })
      };
    });
    
    console.log('Initial state:');
    initialState.firstFiveEmails.forEach((email, i) => {
      console.log(`  ${i+1}. ${email.email} (Legal: ${email.legalScore}) UBS:${email.isUBS} Awilber:${email.isAwilber} Alexa:${email.isAlexapowell}`);
    });
    
    // Now click Legal button and see what happens
    console.log('\n🔄 Clicking Legal button...');
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const legalButton = buttons.find(btn => btn.textContent.includes('Legal') && !btn.textContent.includes('Legal:'));
      if (legalButton) legalButton.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const afterLegalClick = await page.evaluate(() => {
      // Find all email elements again
      const elements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent;
        return text.includes('@') && text.includes('Legal:') && text.length < 500;
      });
      
      return {
        totalFound: elements.length,
        firstFiveEmails: elements.slice(0, 5).map(el => {
          const text = el.textContent;
          const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          const legalMatch = text.match(/Legal:\s+(\d+)\/10/);
          return {
            email: emailMatch ? emailMatch[1] : 'no-match',
            legalScore: legalMatch ? parseInt(legalMatch[1]) : 0,
            isUBS: text.toLowerCase().includes('ubs'),
            isAwilber: text.toLowerCase().includes('awilber'),
            isAlexapowell: text.toLowerCase().includes('alexapowell')
          };
        })
      };
    });
    
    console.log('\nAfter Legal click:');
    afterLegalClick.firstFiveEmails.forEach((email, i) => {
      console.log(`  ${i+1}. ${email.email} (Legal: ${email.legalScore}) UBS:${email.isUBS} Awilber:${email.isAwilber} Alexa:${email.isAlexapowell}`);
    });
    
    // Direct API test from browser console
    console.log('\n📡 Testing API directly from browser...');
    
    const directAPIResult = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:7001/api/email-filtering/analysis?sortBy=legal_relevance');
        const data = await response.json();
        return {
          success: true,
          firstFive: data.data.emails.slice(0, 5).map(email => ({
            email: email.email_address,
            legalScore: email.legal_importance_score,
            msgCount: email.total_message_count
          }))
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    console.log('Direct API test result:');
    if (directAPIResult.success) {
      directAPIResult.firstFive.forEach((email, i) => {
        console.log(`  ${i+1}. ${email.email} (Legal: ${email.legalScore}, Msgs: ${email.msgCount})`);
      });
    } else {
      console.log('  API Error:', directAPIResult.error);
    }
    
    // Check if there's a mismatch
    const apiFirst = directAPIResult.firstFive?.[0]?.email;
    const uiFirst = afterLegalClick.firstFiveEmails?.[0]?.email;
    
    if (apiFirst !== uiFirst) {
      console.log(`\n❌ MISMATCH DETECTED:`);
      console.log(`  API shows first: ${apiFirst}`);
      console.log(`  UI shows first: ${uiFirst}`);
      console.log(`  This indicates a frontend rendering/state issue`);
    } else {
      console.log(`\n✅ API and UI match: ${apiFirst}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await browser.close();
  }
}

debugUIDirect().catch(console.error);