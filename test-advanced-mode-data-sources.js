const { chromium } = require('playwright');

async function testAdvancedModeDataSources() {
  console.log('🚀 Testing Family Navigator Advanced Mode Data Sources...');
  
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const page = await browser.newPage();
  
  try {
    // Navigate to Family Navigator
    console.log('📱 Loading Family Navigator application...');
    await page.goto('http://localhost:4001');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of login page
    await page.screenshot({ path: 'step1-login.png', fullPage: true });
    console.log('✅ Step 1: Login page screenshot saved');
    
    // Look for and click debug skip button
    console.log('🚧 Step 2: Looking for debug skip button...');
    const skipButton = page.locator('text=skip sign-in');
    if (await skipButton.isVisible()) {
      await skipButton.click();
      await page.waitForLoadState('networkidle');
      console.log('✅ Step 2: Authentication bypassed');
      
      // Take screenshot after login
      await page.screenshot({ path: 'step2-after-login.png', fullPage: true });
    } else {
      console.log('❌ Skip button not found');
      return;
    }
    
    // Switch to Advanced Mode first
    console.log('🔧 Step 3: Switching to Advanced Mode...');
    await page.evaluate(() => {
      localStorage.setItem('familynavigator-ui-mode', 'advanced');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    console.log('✅ Step 3: Switched to Advanced Mode');
    
    // Navigate to Communications
    console.log('🔄 Step 4: Navigating to Communications page...');
    try {
      const communicationsLink = page.locator('text=Communications').first();
      if (await communicationsLink.isVisible()) {
        await communicationsLink.click();
        await page.waitForLoadState('networkidle');
        console.log('✅ Step 4: Navigated via link');
      } else {
        await page.goto('http://localhost:4001/communications');
        await page.waitForLoadState('networkidle');
        console.log('✅ Step 4: Navigated via URL');
      }
    } catch (error) {
      console.log('⚠️  Navigation error, trying direct URL...');
      await page.goto('http://localhost:4001/communications');
      await page.waitForLoadState('networkidle');
    }
    
    // Take screenshot of communications page
    await page.screenshot({ path: 'step3-communications-advanced.png', fullPage: true });
    console.log('✅ Step 4: Communications page screenshot saved');
    
    // Wait for any dynamic content to load
    await page.waitForTimeout(2000);
    
    // Enhanced Data Sources Detection
    console.log('🔍 Step 5: Searching for Data Sources functionality...');
    
    // Check for "Data Sources" heading
    const dataSourcesHeading = page.locator('h5:has-text("Data Sources")');
    const dataSourcesCount = await dataSourcesHeading.count();
    console.log(`📊 Found ${dataSourcesCount} "Data Sources" headings`);
    
    // Check for Gmail tab
    const gmailTab = page.locator('[role="tab"]:has-text("Gmail")');
    const gmailTabCount = await gmailTab.count();
    console.log(`📧 Found ${gmailTabCount} "Gmail" tab elements`);
    
    // Check for Text Messages tab
    const textMessagesTab = page.locator('[role="tab"]:has-text("Text Messages")');
    const textMessagesTabCount = await textMessagesTab.count();
    console.log(`💬 Found ${textMessagesTabCount} "Text Messages" tab elements`);
    
    // Check for Files tab
    const filesTab = page.locator('[role="tab"]:has-text("Files")');
    const filesTabCount = await filesTab.count();
    console.log(`📁 Found ${filesTabCount} "Files" tab elements`);
    
    // Check for tablist container
    const tablist = page.locator('[role="tablist"]');
    const tablistCount = await tablist.count();
    console.log(`📑 Found ${tablistCount} tab containers`);
    
    // Test tab functionality if tabs exist
    let tabClickTestPassed = false;
    if (gmailTabCount > 0) {
      console.log('🎯 Step 6: Testing tab click functionality...');
      try {
        // Try clicking Gmail tab
        await gmailTab.first().click();
        await page.waitForTimeout(1000);
        
        // Try clicking Text Messages tab
        if (textMessagesTabCount > 0) {
          await textMessagesTab.first().click();
          await page.waitForTimeout(1000);
        }
        
        // Try clicking Files tab
        if (filesTabCount > 0) {
          await filesTab.first().click();
          await page.waitForTimeout(1000);
        }
        
        tabClickTestPassed = true;
        console.log('✅ Step 6: Tab click functionality works');
        
        // Take final screenshot after tab interactions
        await page.screenshot({ path: 'step4-tabs-interaction.png', fullPage: true });
        
      } catch (error) {
        console.log('❌ Step 6: Tab click test failed:', error.message);
      }
    }
    
    // Check for Advanced UI indicators
    const advancedIndicators = await page.locator('text=Communications Hub').count();
    console.log(`🏛️  Found ${advancedIndicators} "Communications Hub" advanced UI indicators`);
    
    // Feature verification summary
    const hasDataSourcesHeading = dataSourcesCount > 0;
    const hasGmailTab = gmailTabCount > 0;
    const hasTextMessagesTab = textMessagesTabCount > 0;
    const hasFilesTab = filesTabCount > 0;
    const hasTabsStructure = tablistCount > 0;
    const hasAdvancedUI = advancedIndicators > 0;
    
    console.log('\\n📋 ADVANCED MODE FEATURE VERIFICATION:');
    console.log(`✅ Advanced UI Mode: ${hasAdvancedUI ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`✅ Data Sources Heading: ${hasDataSourcesHeading ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`✅ Gmail Tab: ${hasGmailTab ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`✅ Text Messages Tab: ${hasTextMessagesTab ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`✅ Files Tab: ${hasFilesTab ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`✅ Tabs Structure: ${hasTabsStructure ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`✅ Tab Functionality: ${tabClickTestPassed ? 'WORKING' : 'NOT TESTED'}`);
    
    const featuresFound = [
      hasAdvancedUI, hasDataSourcesHeading, hasGmailTab, 
      hasTextMessagesTab, hasFilesTab, hasTabsStructure
    ].filter(Boolean).length;
    
    console.log(`\\n🎯 IMPLEMENTATION STATUS: ${featuresFound}/6 advanced features detected`);
    
    if (featuresFound >= 5) {
      console.log('🎉 DATA SOURCES TABS SUCCESSFULLY IMPLEMENTED IN ADVANCED MODE');
    } else if (featuresFound >= 3) {
      console.log('⚠️  DATA SOURCES TABS PARTIALLY IMPLEMENTED');
    } else {
      console.log('❌ DATA SOURCES TABS IMPLEMENTATION NEEDS ATTENTION');
    }
    
    // Extended inspection time
    console.log('\\n⏱️  Keeping browser open for 15 seconds for manual verification...');
    await page.waitForTimeout(15000);
    
  } catch (error) {
    console.error('❌ Test execution error:', error.message);
    
    // Take error screenshot
    try {
      await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    } catch (screenshotError) {
      console.error('Could not take error screenshot');
    }
  } finally {
    await browser.close();
  }
}

// Run the test
testAdvancedModeDataSources().catch(console.error);