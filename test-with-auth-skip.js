const puppeteer = require('puppeteer');

async function testWithAuthSkip() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    defaultViewport: { width: 1400, height: 900 }
  });
  
  const page = await browser.newPage();
  
  // Enable logging for debugging
  page.on('console', msg => {
    if (msg.text().includes('Applying filter') || msg.text().includes('filter')) {
      console.log('🖥️  FILTER LOG:', msg.text());
    }
  });
  
  page.on('request', req => {
    if (req.url().includes('/api/communications')) {
      console.log('🌐 API REQUEST:', req.method(), req.url());
    }
  });
  
  page.on('response', res => {
    if (res.url().includes('/api/communications')) {
      console.log('🌐 API RESPONSE:', res.status(), res.url());
      if (res.url().includes('gmail_query')) {
        console.log('   ✅ This is a FILTERED request!');
      }
    }
  });
  
  try {
    console.log('🔄 Testing Apply Filter with authentication bypass...\n');
    
    // Step 1: Navigate to the app
    console.log('1️⃣ Loading communications page...');
    await page.goto('http://localhost:4001/communications', { 
      waitUntil: 'networkidle0', 
      timeout: 30000 
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 2: Handle authentication (click Skip Sign-In)
    console.log('2️⃣ Handling authentication...');
    
    const authHandled = await page.evaluate(() => {
      // Look for Skip Sign-In button
      const buttons = Array.from(document.querySelectorAll('button'));
      const skipButton = buttons.find(btn => btn.textContent.includes('Skip Sign-In') || btn.textContent.includes('Debug'));
      
      if (skipButton) {
        skipButton.click();
        return { success: true, found: 'Skip Sign-In button' };
      }
      
      // If already authenticated, look for communications content
      const hasCommunications = document.body.textContent.includes('Communications') || 
                               document.body.textContent.includes('Recent Activity');
      
      return { 
        success: hasCommunications, 
        found: hasCommunications ? 'Already authenticated' : 'No auth bypass found',
        bodyPreview: document.body.textContent.substring(0, 200)
      };
    });
    
    console.log('🔐 Auth result:', authHandled);
    
    if (authHandled.success && authHandled.found === 'Skip Sign-In button') {
      console.log('✅ Clicked Skip Sign-In button, waiting for app to load...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Step 3: Verify we're on communications page now
    const pageState = await page.evaluate(() => {
      const communications = Array.from(document.querySelectorAll('li')).filter(li => 
        li.textContent.includes('From:') && li.textContent.includes('To:')
      );
      
      const emailItems = Array.from(document.querySelectorAll('li')).filter(li => {
        const text = li.textContent;
        return text.includes('@') && !text.includes('From:') && !text.includes('Subject:') && text.length < 300;
      });
      
      return {
        currentUrl: window.location.href,
        hasCommunications: document.body.textContent.includes('Communications'),
        hasEmailFilteringPanel: document.body.textContent.includes('Email Address Filtering') || 
                                document.body.textContent.includes('Filtering'),
        communicationCount: communications.length,
        emailItemCount: emailItems.length,
        hasApplyButton: Array.from(document.querySelectorAll('button')).some(btn => btn.textContent.includes('Apply Filter')),
        bodyPreview: document.body.textContent.substring(0, 300)
      };
    });
    
    console.log('📊 Page state after auth:', {
      url: pageState.currentUrl,
      hasCommunications: pageState.hasCommunications,
      hasFiltering: pageState.hasEmailFilteringPanel,
      communications: pageState.communicationCount,
      emailItems: pageState.emailItemCount,
      hasApplyButton: pageState.hasApplyButton
    });
    
    if (pageState.communicationCount === 0) {
      console.log('❌ Still no communications visible after auth bypass');
      console.log('Body preview:', pageState.bodyPreview);
      throw new Error('Communications not loading after authentication');
    }
    
    // Step 4: Find and click on alexapowell@gmail.com
    console.log('3️⃣ Looking for alexapowell@gmail.com in filtering panel...');
    
    const emailClickResult = await page.evaluate(() => {
      // Better approach: Look for Box elements with cursor pointer that contain alexapowell@gmail.com
      const clickableBoxes = Array.from(document.querySelectorAll('div')).filter(div => {
        const style = window.getComputedStyle(div);
        return style.cursor === 'pointer' && div.textContent.includes('alexapowell@gmail.com');
      });
      
      if (clickableBoxes.length === 0) {
        // Fallback: look in all elements containing the email
        const allElements = Array.from(document.querySelectorAll('*')).filter(el => 
          el.textContent.includes('alexapowell@gmail.com') && 
          !el.textContent.includes('From:') && 
          !el.textContent.includes('Subject:')
        );
        
        return Promise.resolve({ 
          success: false, 
          error: 'No clickable elements found for alexapowell@gmail.com',
          elementsFound: allElements.length,
          clickableBoxes: clickableBoxes.length,
          firstElementText: allElements.length > 0 ? allElements[0].textContent.substring(0, 100) : 'None'
        });
      }
      
      // Add a console log to track when the click happens
      console.log('🔍 FILTER LOG: About to click on alexapowell@gmail.com element');
      
      const targetBox = clickableBoxes[0];
      targetBox.click();
      
      console.log('🔍 FILTER LOG: Clicked on alexapowell@gmail.com element');
      
      // Wait for React state update
      return new Promise(resolve => {
        setTimeout(() => {
          const queryField = document.querySelector('textarea[placeholder*="person@example.com"]');
          const queryValue = queryField ? queryField.value : 'Query field not found';
          
          console.log('🔍 FILTER LOG: Query value after click:', queryValue);
          
          resolve({ 
            success: true, 
            clicked: 'alexapowell@gmail.com',
            clickableBoxes: clickableBoxes.length,
            queryAfterClick: queryValue,
            elementClicked: targetBox.tagName
          });
        }, 2000); // Increased wait time for React state update
      });
    });
    
    console.log('📧 Email click result:', emailClickResult);
    
    if (!emailClickResult.success) {
      throw new Error(emailClickResult.error + '. Available emails: ' + emailClickResult.allEmailsFound.join(', '));
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 5: Click Apply Filter
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
    
    console.log('🔘 Apply Filter result:', applyResult);
    
    if (!applyResult.success) {
      throw new Error(applyResult.error);
    }
    
    // Step 6: Wait for filtering and check results
    console.log('5️⃣ Waiting for filtering to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const finalResults = await page.evaluate(() => {
      const communications = Array.from(document.querySelectorAll('li')).filter(li => 
        li.textContent.includes('From:') && li.textContent.includes('To:')
      );
      
      // Analyze first 3 communications for relevance to alexapowell@gmail.com
      const analysis = communications.slice(0, 3).map((comm, i) => {
        const text = comm.textContent;
        
        // Better parsing: Look for the actual To: field content
        const fromMatch = text.match(/From:\s*([^•]+)•/);
        const toMatch = text.match(/To:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        
        const fromText = fromMatch ? fromMatch[1].trim() : 'parse error';
        const toText = toMatch ? toMatch[1].trim() : 'parse error';
        
        // Check if either from or to contains alexapowell@gmail.com
        const hasAlexaFrom = fromText.includes('alexapowell@gmail.com');
        const hasAlexaTo = toText.includes('alexapowell@gmail.com');
        const hasAlexa = hasAlexaFrom || hasAlexaTo;
        
        return {
          index: i + 1,
          from: fromText,
          to: toText,
          hasAlexaFrom,
          hasAlexaTo,
          relevant: hasAlexa,
          fullText: text.substring(0, 200) // Include more text for debugging
        };
      });
      
      const hasFilteredChip = Array.from(document.querySelectorAll('*')).some(el => 
        el.textContent.includes('Filtered:')
      );
      
      return {
        totalCommunications: communications.length,
        hasFilteredChip,
        analysis,
        allRelevant: analysis.length > 0 && analysis.every(a => a.relevant)
      };
    });
    
    console.log('\n📋 FINAL RESULTS:');
    console.log('   Total communications:', finalResults.totalCommunications);
    console.log('   Has filtered chip:', finalResults.hasFilteredChip);
    console.log('   All results relevant:', finalResults.allRelevant);
    
    console.log('\n🔍 Communication Analysis:');
    finalResults.analysis.forEach(result => {
      const status = result.relevant ? '✅ RELEVANT' : '❌ NOT RELEVANT';
      console.log(`   ${result.index}. ${status}`);
      console.log(`      From: ${result.from}`);
      console.log(`      To: ${result.to}`);
      console.log(`      Has Alexa From: ${result.hasAlexaFrom}`);
      console.log(`      Has Alexa To: ${result.hasAlexaTo}`);
      console.log(`      Full text: ${result.fullText}`);
      console.log('');
    });
    
    // Final verdict
    if (finalResults.allRelevant && finalResults.analysis.length > 0) {
      console.log('\n🎉 SUCCESS: Apply Filter is working correctly!');
      console.log('   ✅ All displayed communications relate to alexapowell@gmail.com');
      console.log('   ✅ Real browser clicking and filtering works');
    } else {
      console.log('\n❌ FAILURE: Apply Filter is NOT working correctly');
      console.log('   ❌ Some communications do not match the filter criteria');
      console.log('   ❌ User report is confirmed - filtering shows wrong results');
    }
    
    // Keep browser open for inspection
    console.log('\n👁️  Browser staying open for 10 seconds for inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testWithAuthSkip().catch(console.error);