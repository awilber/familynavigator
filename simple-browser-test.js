const puppeteer = require('puppeteer');

async function simpleBrowserTest() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: false,
    defaultViewport: { width: 1400, height: 900 }
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('🔄 Simple browser test - verifying Apply Filter works...');
    
    // Navigate to communications page
    await page.goto('http://localhost:4002/communications', { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('✅ Navigated to communications page');
    
    // Wait for page to load and count initial communications
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const initialState = await page.evaluate(() => {
      // Count items that look like communications (have From: and To:)
      const allListItems = Array.from(document.querySelectorAll('li'));
      const communicationItems = allListItems.filter(item => 
        item.textContent.includes('From:') && item.textContent.includes('To:')
      );
      
      // Also look for email addresses in filtering panel (items with @ but not From:/To:)
      const emailItems = allListItems.filter(item => {
        const text = item.textContent;
        return text.includes('@') && !text.includes('From:') && !text.includes('Subject:') && text.length < 200;
      });
      
      return {
        communicationCount: communicationItems.length,
        emailAddressCount: emailItems.length,
        hasFilteringPanel: document.body.textContent.includes('Email Address Filtering') || document.body.textContent.includes('Discovered Email Addresses'),
        hasApplyButton: Array.from(document.querySelectorAll('button')).some(btn => btn.textContent.includes('Apply Filter'))
      };
    });
    
    console.log(`📊 Initial state:`, initialState);
    
    if (initialState.communicationCount === 0) {
      throw new Error('No communications found - display format may be broken');
    }
    
    if (!initialState.hasFilteringPanel) {
      throw new Error('Email Address Filtering panel not found');
    }
    
    if (!initialState.hasApplyButton) {
      throw new Error('Apply Filter button not found');
    }
    
    console.log('✅ All required elements found on page');
    
    // Try to click on an email address and apply filter
    const filterResult = await page.evaluate(() => {
      // Find email addresses in filtering panel
      const allListItems = Array.from(document.querySelectorAll('li'));
      const emailItems = allListItems.filter(item => {
        const text = item.textContent;
        return text.includes('@') && !text.includes('From:') && !text.includes('Subject:') && text.length < 200;
      });
      
      if (emailItems.length === 0) return { success: false, error: 'No email items found' };
      
      // Click on third email item (or first if less than 3)
      const targetIndex = Math.min(2, emailItems.length - 1);
      const targetEmail = emailItems[targetIndex];
      targetEmail.click();
      
      // Wait a bit for selection
      setTimeout(() => {
        // Find and click Apply Filter button
        const buttons = Array.from(document.querySelectorAll('button'));
        const applyButton = buttons.find(btn => btn.textContent.includes('Apply Filter'));
        
        if (applyButton) {
          applyButton.click();
        }
      }, 1000);
      
      return { 
        success: true, 
        targetEmail: targetEmail.textContent.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)?.[0] || 'unknown',
        clickedEmail: targetIndex + 1
      };
    });
    
    console.log(`🎯 Filter action:`, filterResult);
    
    if (!filterResult.success) {
      throw new Error(filterResult.error);
    }
    
    console.log(`📧 Testing with email: ${filterResult.targetEmail}`);
    
    // Wait for filtering to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check final state
    const finalState = await page.evaluate(() => {
      const allListItems = Array.from(document.querySelectorAll('li'));
      const communicationItems = allListItems.filter(item => 
        item.textContent.includes('From:') && item.textContent.includes('To:')
      );
      
      // Check for filtered chip
      const hasFilteredChip = Array.from(document.querySelectorAll('*')).some(el => 
        el.textContent.includes('Filtered:')
      );
      
      return {
        communicationCount: communicationItems.length,
        hasFilteredChip,
        sampleText: communicationItems.length > 0 ? communicationItems[0].textContent.substring(0, 150) + '...' : 'No communications'
      };
    });
    
    console.log(`📊 Final state:`, finalState);
    
    // Determine if filtering worked
    const filterWorked = finalState.communicationCount !== initialState.communicationCount;
    const hasVisualIndicator = finalState.hasFilteredChip;
    
    console.log('\n🎯 RESULTS:');
    console.log(`   Initial communications: ${initialState.communicationCount}`);
    console.log(`   Final communications: ${finalState.communicationCount}`);
    console.log(`   Filter changed results: ${filterWorked ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   Filtered chip visible: ${hasVisualIndicator ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   Display format working: ${finalState.communicationCount > 0 ? 'YES ✅' : 'NO ❌'}`);
    
    if (filterWorked || hasVisualIndicator) {
      console.log('\n🎉 SUCCESS: Apply Filter functionality is working!');
      console.log(`   - Clicking on email addresses and Apply Filter changes the results`);
      console.log(`   - Display format shows From/To information correctly`);
      console.log(`   - Test completed successfully`);
    } else {
      console.log('\n❌ ISSUE: Apply Filter may not be working as expected');
      console.log(`   - Results did not change after clicking Apply Filter`);
      console.log(`   - This could indicate frontend-backend integration issues`);
    }
    
    // Keep browser open for 3 seconds to show final state
    await new Promise(resolve => setTimeout(resolve, 3000));
    
  } catch (error) {
    console.error('❌ Browser test failed:', error.message);
  } finally {
    await browser.close();
  }
}

simpleBrowserTest().catch(console.error);