const puppeteer = require('puppeteer');

async function testRealBrowserClicking() {
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
  
  // Enable request logging
  page.on('request', req => {
    if (req.url().includes('/api/communications') && req.url().includes('gmail_query')) {
      console.log('🌐 API REQUEST:', req.url());
    }
  });
  
  page.on('response', res => {
    if (res.url().includes('/api/communications') && res.url().includes('gmail_query')) {
      console.log('🌐 API RESPONSE:', res.status(), res.url());
    }
  });
  
  try {
    console.log('🔄 Testing REAL browser clicking and Apply Filter...\n');
    
    // Navigate to the app
    console.log('1️⃣ Navigating to http://localhost:4002/communications...');
    await page.goto('http://localhost:4002/communications', { 
      waitUntil: 'networkidle0', 
      timeout: 30000 
    });
    
    // Wait for page to fully load
    console.log('2️⃣ Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get initial state
    const initialState = await page.evaluate(() => {
      const communications = Array.from(document.querySelectorAll('li')).filter(li => 
        li.textContent.includes('From:') && li.textContent.includes('To:')
      );
      
      const emailItems = Array.from(document.querySelectorAll('li')).filter(li => {
        const text = li.textContent;
        return text.includes('@') && !text.includes('From:') && !text.includes('Subject:') && text.length < 300;
      });
      
      return {
        communicationCount: communications.length,
        emailItemCount: emailItems.length,
        sampleCommunication: communications.length > 0 ? communications[0].textContent.substring(0, 100) + '...' : 'None'
      };
    });
    
    console.log('📊 Initial state:', initialState);
    
    if (initialState.communicationCount === 0) {
      throw new Error('No communications found on page - UI may not be working');
    }
    
    if (initialState.emailItemCount === 0) {
      throw new Error('No email addresses found in filtering panel');
    }
    
    // Get the third email address (alexapowell@gmail.com)
    console.log('3️⃣ Finding and clicking on alexapowell@gmail.com...');
    
    const clickResult = await page.evaluate(() => {
      const emailItems = Array.from(document.querySelectorAll('li')).filter(li => {
        const text = li.textContent;
        return text.includes('@') && !text.includes('From:') && !text.includes('Subject:') && text.length < 300;
      });
      
      // Find alexapowell@gmail.com specifically
      const alexaItem = emailItems.find(item => item.textContent.includes('alexapowell@gmail.com'));
      
      if (!alexaItem) {
        return { success: false, error: 'Could not find alexapowell@gmail.com in email list' };
      }
      
      // Click on the email item
      alexaItem.click();
      
      return { 
        success: true, 
        text: alexaItem.textContent.substring(0, 100),
        clicked: 'alexapowell@gmail.com'
      };
    });
    
    console.log('📧 Click result:', clickResult);
    
    if (!clickResult.success) {
      throw new Error(clickResult.error);
    }
    
    // Wait for selection to register
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Click Apply Filter button
    console.log('4️⃣ Clicking Apply Filter button...');
    
    const applyResult = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const applyButton = buttons.find(btn => btn.textContent.includes('Apply Filter'));
      
      if (!applyButton) {
        return { success: false, error: 'Apply Filter button not found' };
      }
      
      if (applyButton.disabled) {
        return { success: false, error: 'Apply Filter button is disabled' };
      }
      
      applyButton.click();
      return { success: true };
    });
    
    console.log('🔘 Apply button result:', applyResult);
    
    if (!applyResult.success) {
      throw new Error(applyResult.error);
    }
    
    // Wait for filtering to complete
    console.log('5️⃣ Waiting for filtering to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check the results
    const finalState = await page.evaluate(() => {
      const communications = Array.from(document.querySelectorAll('li')).filter(li => 
        li.textContent.includes('From:') && li.textContent.includes('To:')
      );
      
      // Check for filtered chip
      const hasFilteredChip = Array.from(document.querySelectorAll('*')).some(el => 
        el.textContent.includes('Filtered:')
      );
      
      // Analyze the first 5 communications to see if they match the filter
      const analysisResults = communications.slice(0, 5).map((comm, i) => {
        const text = comm.textContent;
        const hasAlexa = text.includes('alexapowell@gmail.com') || text.includes('alexapowell');
        
        // Extract From and To information
        const fromMatch = text.match(/From:\s*([^•]*)/);
        const toMatch = text.match(/To:\s*([^gmail]*)/);
        
        return {
          index: i + 1,
          hasAlexaReference: hasAlexa,
          from: fromMatch ? fromMatch[1].trim() : 'Unknown',
          to: toMatch ? toMatch[1].trim() : 'Unknown',
          preview: text.substring(0, 150) + '...'
        };
      });
      
      return {
        communicationCount: communications.length,
        hasFilteredChip,
        analysisResults,
        allCommunicationsMatchFilter: analysisResults.every(result => result.hasAlexaReference)
      };
    });
    
    console.log('📋 Final state:', {
      communicationCount: finalState.communicationCount,
      hasFilteredChip: finalState.hasFilteredChip,
      allMatch: finalState.allCommunicationsMatchFilter
    });
    
    console.log('🔍 Communication Analysis:');
    finalState.analysisResults.forEach(result => {
      const status = result.hasAlexaReference ? '✅ MATCH' : '❌ NO MATCH';
      console.log(`   ${result.index}. ${status}`);
      console.log(`      From: ${result.from}`);
      console.log(`      To: ${result.to}`);
      console.log(`      Has Alexa: ${result.hasAlexaReference}`);
      console.log('');
    });
    
    // Final verdict
    if (finalState.communicationCount !== initialState.communicationCount) {
      console.log('✅ Filter changed the number of results');
    } else {
      console.log('❌ Filter did not change the number of results');
    }
    
    if (finalState.hasFilteredChip) {
      console.log('✅ Filtered chip is visible');
    } else {
      console.log('❌ No filtered chip visible');
    }
    
    if (finalState.allCommunicationsMatchFilter) {
      console.log('✅ All displayed communications match the filter criteria');
    } else {
      console.log('❌ Some communications do NOT match the filter criteria');
    }
    
    console.log('\n🎯 FINAL VERDICT:');
    
    if (finalState.allCommunicationsMatchFilter && finalState.hasFilteredChip) {
      console.log('🎉 SUCCESS: Apply Filter is working correctly!');
      console.log('   - All displayed emails relate to alexapowell@gmail.com');
      console.log('   - UI shows filtered indicator');
      console.log('   - Real browser clicking works as expected');
    } else {
      console.log('❌ FAILURE: Apply Filter is NOT working correctly');
      console.log('   - Some displayed emails do not match the filter');
      console.log('   - Frontend-backend integration has issues');
      console.log('   - Real browser test reveals problems not caught by API tests');
    }
    
    // Keep browser open for manual inspection
    console.log('\n👁️  Browser will stay open for 10 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('❌ Real browser test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testRealBrowserClicking().catch(console.error);