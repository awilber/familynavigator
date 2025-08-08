const puppeteer = require('puppeteer');

async function testEmailFilteringFunctionality() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: false,
    defaultViewport: { width: 1400, height: 900 }
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('🔄 Starting Email Filtering Test...');
    
    // Step 1: Navigate and get past auth
    await page.goto('http://localhost:4002', { waitUntil: 'networkidle0' });
    await page.goto('http://localhost:4002/communications', { waitUntil: 'networkidle0' });
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('✅ Communications page loaded');
    
    // Step 2: Wait for Email Filtering Panel to be visible
    await page.waitForSelector('h5, h6', { timeout: 10000 });
    const filteringPanelExists = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h5, h6, div'));
      return headings.some(h => h.textContent.includes('Email Address Filtering'));
    });
    
    if (!filteringPanelExists) {
      throw new Error('Email Address Filtering panel not found');
    }
    console.log('✅ Email Address Filtering panel found');
    
    // Step 3: Get initial communication count
    await new Promise(resolve => setTimeout(resolve, 2000));
    const initialCount = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('li'));
      return items.filter(item => 
        item.textContent.includes('From:') && item.textContent.includes('To:')
      ).length;
    });
    console.log(`📧 Initial communications count: ${initialCount}`);
    
    if (initialCount === 0) {
      throw new Error('No communications found initially - display format may be broken');
    }
    
    // Step 4: Get list of email addresses in filtering panel
    await new Promise(resolve => setTimeout(resolve, 1000));
    const emailAddresses = await page.evaluate(() => {
      const listItems = Array.from(document.querySelectorAll('li'));
      const emailItems = listItems.filter(item => {
        const text = item.textContent;
        return text.includes('@') && !text.includes('From:') && !text.includes('Subject:');
      });
      
      return emailItems.map((item, index) => ({
        index,
        element: item,
        text: item.textContent.trim(),
        emailMatch: item.textContent.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)?.[0]
      })).filter(item => item.emailMatch);
    });
    
    console.log(`📋 Found ${emailAddresses.length} email addresses in filtering panel`);
    
    if (emailAddresses.length === 0) {
      throw new Error('No email addresses found in filtering panel');
    }
    
    // Step 5: Test filtering with the third email address (or first if less than 3)
    const testEmailIndex = Math.min(2, emailAddresses.length - 1);
    const testEmail = emailAddresses[testEmailIndex];
    console.log(`🎯 Testing filter with email #${testEmailIndex + 1}: ${testEmail.emailMatch}`);
    
    // Click on the email address item to select it
    await page.evaluate((index) => {
      const listItems = Array.from(document.querySelectorAll('li'));
      const emailItems = listItems.filter(item => {
        const text = item.textContent;
        return text.includes('@') && !text.includes('From:') && !text.includes('Subject:');
      });
      
      if (emailItems[index]) {
        emailItems[index].click();
      }
    }, testEmailIndex);
    
    console.log('✅ Clicked on email address item');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 6: Find and click Apply Filter button
    const applyButtonClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const applyButton = buttons.find(btn => btn.textContent.includes('Apply Filter'));
      
      if (applyButton) {
        applyButton.click();
        return true;
      }
      return false;
    });
    
    if (!applyButtonClicked) {
      throw new Error('Apply Filter button not found or not clickable');
    }
    
    console.log('✅ Apply Filter button clicked');
    
    // Step 7: Wait for filtering to complete and verify results
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Check for filtered chip
    const hasFilteredChip = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements.some(el => el.textContent.includes('Filtered:'));
    });
    
    if (hasFilteredChip) {
      console.log('✅ Filtered chip is visible');
    } else {
      console.log('⚠️  Filtered chip not found');
    }
    
    // Count communications after filtering
    const filteredCount = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('li'));
      return items.filter(item => 
        item.textContent.includes('From:') && item.textContent.includes('To:')
      ).length;
    });
    
    console.log(`📧 Communications count after filtering: ${filteredCount}`);
    
    // Step 8: Verify that filtering actually changed the results
    if (filteredCount === initialCount) {
      console.log('❌ FILTER FAILED: Communication count did not change');
      
      // Check if there are any network errors or API issues
      const apiTest = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/communications?gmail_query=from:test@example.com');
          const data = await response.json();
          return { success: response.ok, data: data.data ? data.data.length : 0 };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });
      
      console.log('🔍 API Test Result:', apiTest);
      
    } else if (filteredCount > 0 && filteredCount < initialCount) {
      console.log('✅ FILTER WORKING: Communication count decreased appropriately');
    } else if (filteredCount === 0) {
      console.log('⚠️  FILTER TOO RESTRICTIVE: No communications match the filter');
    } else {
      console.log('❓ UNEXPECTED: Filtered count is higher than initial count');
    }
    
    // Step 9: Verify display format is correct
    const displayFormatCheck = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('li'));
      const emailItems = items.filter(item => 
        item.textContent.includes('From:') && item.textContent.includes('To:')
      );
      
      if (emailItems.length === 0) return { valid: false, reason: 'No email items found' };
      
      const firstItem = emailItems[0];
      const text = firstItem.textContent;
      
      const hasFrom = text.includes('From:');
      const hasTo = text.includes('To:');
      const hasValidStructure = hasFrom && hasTo;
      
      return {
        valid: hasValidStructure,
        hasFrom,
        hasTo,
        sampleText: text.substring(0, 200),
        totalItems: emailItems.length
      };
    });
    
    console.log('📋 Display Format Check:', displayFormatCheck);
    
    if (displayFormatCheck.valid) {
      console.log('✅ Display format is correct with From/To structure');
    } else {
      console.log('❌ Display format is incorrect');
    }
    
    // Step 10: Test Clear Filter
    console.log('\n🔄 Testing Clear Filter functionality...');
    
    const clearButtonClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const clearButton = buttons.find(btn => btn.textContent.includes('Clear Filter'));
      
      if (clearButton) {
        clearButton.click();
        return true;
      }
      return false;
    });
    
    if (clearButtonClicked) {
      console.log('✅ Clear Filter button clicked');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const clearedCount = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('li'));
        return items.filter(item => 
          item.textContent.includes('From:') && item.textContent.includes('To:')
        ).length;
      });
      
      console.log(`📧 Communications count after clearing: ${clearedCount}`);
      
      if (clearedCount >= filteredCount) {
        console.log('✅ Clear Filter appears to work');
      } else {
        console.log('❌ Clear Filter may not be working properly');
      }
    } else {
      console.log('⚠️  Clear Filter button not found');
    }
    
    // Summary
    console.log('\n📊 FINAL RESULTS:');
    console.log(`   Initial count: ${initialCount}`);
    console.log(`   Filtered count: ${filteredCount}`);
    console.log(`   Filter working: ${filteredCount !== initialCount ? 'YES' : 'NO'}`);
    console.log(`   Display format: ${displayFormatCheck.valid ? 'CORRECT' : 'INCORRECT'}`);
    console.log(`   Test email: ${testEmail.emailMatch}`);
    
    if (filteredCount === initialCount) {
      console.log('\n❌ MAIN ISSUE: Apply Filter does not change the results');
      console.log('   This indicates the Gmail query parsing or API integration is not working');
    } else {
      console.log('\n✅ SUCCESS: Email filtering is functional');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  } finally {
    await browser.close();
  }
}

testEmailFilteringFunctionality().catch(console.error);