const puppeteer = require('puppeteer');

async function testFilteringAccuracy() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: false,
    defaultViewport: { width: 1200, height: 800 }
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to the application
    console.log('🔄 Navigating to Family Navigator...');
    await page.goto('http://localhost:3088', { waitUntil: 'networkidle0' });
    
    // Wait for and click debug skip button if it exists
    try {
      await page.waitForSelector('button', { timeout: 3000 });
      const debugButton = await page.$x("//button[contains(text(), 'Skip Login (Debug)')]");
      if (debugButton.length > 0) {
        await debugButton[0].click();
      }
      console.log('✅ Clicked debug skip button');
    } catch (e) {
      console.log('⚠️  No debug skip button found, continuing...');
    }
    
    // Navigate to communications
    console.log('🔄 Navigating to Communications...');
    await page.goto('http://localhost:3088/communications', { waitUntil: 'networkidle0' });
    
    // Wait for the page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // First, get a count of initial communications
    const initialComms = await page.$$eval('[data-testid="communication-item"], .MuiListItem-root', (items) => {
      return items.filter(item => item.textContent.includes('From:') || item.textContent.includes('Subject:')).length;
    });
    console.log(`📧 Found ${initialComms} communications initially`);
    
    // Test 1: Check if email filtering panel is visible
    console.log('\n🔍 Test 1: Checking email filtering panel visibility...');
    const filteringPanelElements = await page.$x("//text()[contains(., 'Email Address Filtering')]");
    if (filteringPanelElements.length > 0) {
      console.log('✅ Email filtering panel is visible');
    } else {
      console.log('❌ Email filtering panel not found');
      await browser.close();
      return;
    }
    
    // Test 2: Check discovered email addresses
    console.log('\n🔍 Test 2: Checking discovered email addresses...');
    
    // Get all email address items in the discovery panel
    const emailAddresses = await page.$$eval('.MuiListItem-root', (items) => {
      return items
        .filter(item => item.textContent.includes('@'))
        .map(item => ({
          text: item.textContent,
          email: item.textContent.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)?.[0] || 'no-email-found'
        }))
        .slice(0, 8); // Limit to first 8 items to avoid picking up communications
    });
    
    console.log(`📋 Found ${emailAddresses.length} email address entries`);
    emailAddresses.forEach((addr, i) => {
      console.log(`   ${i + 1}. ${addr.email}`);
    });
    
    if (emailAddresses.length === 0) {
      console.log('❌ No email addresses found in filtering panel');
      await browser.close();
      return;
    }
    
    // Test 3: Apply filter with first email address
    console.log('\n🔍 Test 3: Testing filtering functionality...');
    
    const firstEmailAddress = emailAddresses[0].email;
    console.log(`🎯 Testing filter with email: ${firstEmailAddress}`);
    
    // Click on first email address to select it
    const firstEmailItem = await page.$eval('.MuiListItem-root', (item, targetEmail) => {
      const items = Array.from(document.querySelectorAll('.MuiListItem-root'));
      const emailItem = items.find(item => item.textContent.includes(targetEmail));
      if (emailItem) {
        emailItem.click();
        return true;
      }
      return false;
    }, firstEmailAddress);
    
    if (!firstEmailItem) {
      console.log(`❌ Could not click on email item: ${firstEmailAddress}`);
      await browser.close();
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Click Apply Filter button
    try {
      const applyButton = await page.$x("//button[contains(text(), 'Apply Filter')]");
      if (applyButton.length > 0) {
        await applyButton[0].click();
        console.log('✅ Clicked Apply Filter button');
      } else {
        throw new Error('Apply Filter button not found');
      }
    } catch (e) {
      console.log('❌ Could not find or click Apply Filter button');
      await browser.close();
      return;
    }
    
    // Wait for filtering to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 4: Verify filtering results
    console.log('\n🔍 Test 4: Verifying filtering results...');
    
    // Check for the filtered chip
    const filteredChipElements = await page.$x("//text()[contains(., 'Filtered:')]");
    if (filteredChipElements.length > 0) {
      console.log('✅ Filtered chip is visible');
    } else {
      console.log('❌ Filtered chip not found');
    }
    
    // Count communications after filtering
    const filteredComms = await page.$$eval('[data-testid="communication-item"], .MuiListItem-root', (items) => {
      return items.filter(item => item.textContent.includes('From:') || item.textContent.includes('Subject:')).length;
    });
    console.log(`📧 Found ${filteredComms} communications after filtering`);
    
    // Check if the new display format is working
    console.log('\n🔍 Test 5: Checking new display format...');
    
    const formattedComms = await page.$$eval('.MuiListItem-root', (items) => {
      return items
        .filter(item => item.textContent.includes('From:') && item.textContent.includes('To:'))
        .slice(0, 3) // Get first 3 communications
        .map(item => ({
          hasFrom: item.textContent.includes('From:'),
          hasTo: item.textContent.includes('To:'),
          hasSubject: item.textContent.includes('Subject:'),
          text: item.textContent.substring(0, 200) + '...'
        }));
    });
    
    console.log(`📋 Found ${formattedComms.length} communications with new format:`);
    formattedComms.forEach((comm, i) => {
      console.log(`   ${i + 1}. From: ${comm.hasFrom}, To: ${comm.hasTo}, Subject: ${comm.hasSubject}`);
      console.log(`      Preview: ${comm.text.replace(/\s+/g, ' ')}`);
    });
    
    // Test 6: Clear filter and verify
    console.log('\n🔍 Test 6: Testing clear filter...');
    try {
      const clearButton = await page.$x("//button[contains(text(), 'Clear Filter')]");
      if (clearButton.length > 0) {
        await clearButton[0].click();
        console.log('✅ Clicked Clear Filter button');
      } else {
        throw new Error('Clear Filter button not found');
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const clearedComms = await page.$$eval('[data-testid="communication-item"], .MuiListItem-root', (items) => {
        return items.filter(item => item.textContent.includes('From:') || item.textContent.includes('Subject:')).length;
      });
      console.log(`📧 Found ${clearedComms} communications after clearing filter`);
      
      if (clearedComms >= filteredComms) {
        console.log('✅ Clear filter appears to be working - more communications visible');
      } else {
        console.log('⚠️  Clear filter may not be working - fewer communications than expected');
      }
    } catch (e) {
      console.log('❌ Could not find or click Clear Filter button');
    }
    
    console.log('\n📊 Summary:');
    console.log(`   Initial communications: ${initialComms}`);
    console.log(`   Filtered communications: ${filteredComms}`);
    console.log(`   Display format updated: ${formattedComms.length > 0 ? 'Yes' : 'No'}`);
    console.log(`   From/To info visible: ${formattedComms.filter(c => c.hasFrom && c.hasTo).length}/${formattedComms.length}`);
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
  
  await browser.close();
}

testFilteringAccuracy().catch(console.error);