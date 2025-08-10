const { chromium } = require('playwright');

async function testDataSourcesTabs() {
  console.log('🚀 Testing Family Navigator Data Sources Tabs...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to Family Navigator
    console.log('📱 Loading Family Navigator application...');
    await page.goto('http://localhost:4001');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of login page
    await page.screenshot({ path: 'login-page.png', fullPage: true });
    console.log('✅ Login page screenshot saved');
    
    // Look for debug skip button
    console.log('🚧 Looking for debug skip button...');
    const skipButton = page.locator('text=skip sign-in');
    if (await skipButton.isVisible()) {
      await skipButton.click();
      await page.waitForLoadState('networkidle');
      console.log('✅ Authentication bypassed');
    } else {
      console.log('❌ Skip button not found');
    }
    
    // Navigate to Communications
    console.log('🔄 Navigating to Communications page...');
    const communicationsLink = page.locator('text=Communications').first();
    if (await communicationsLink.isVisible()) {
      await communicationsLink.click();
      await page.waitForLoadState('networkidle');
      console.log('✅ Navigated to Communications page');
    } else {
      console.log('❌ Communications link not found, trying URL navigation');
      await page.goto('http://localhost:4001/communications');
      await page.waitForLoadState('networkidle');
    }
    
    // Take screenshot of communications page
    await page.screenshot({ path: 'communications-page.png', fullPage: true });
    console.log('✅ Communications page screenshot saved');
    
    // Look for Data Sources section
    console.log('🔍 Searching for Data Sources tabs...');
    
    const dataSources = await page.locator('text=Data Sources').count();
    console.log(`📊 Found ${dataSources} "Data Sources" text instances`);
    
    // Check for Gmail tab
    const gmailTab = await page.locator('text=Gmail').count();
    console.log(`📧 Found ${gmailTab} "Gmail" tab instances`);
    
    // Check for Text Messages tab
    const textMessagesTab = await page.locator('text=Text Messages').count();
    console.log(`💬 Found ${textMessagesTab} "Text Messages" tab instances`);
    
    // Check for Files tab
    const filesTab = await page.locator('text=Files').count();
    console.log(`📁 Found ${filesTab} "Files" tab instances`);
    
    // Check for overall tabs structure
    const tabsElements = await page.locator('[role="tablist"]').count();
    console.log(`📑 Found ${tabsElements} tab containers`);
    
    // Look for Material-UI Tab components
    const muiTabs = await page.locator('.MuiTab-root').count();
    console.log(`🎯 Found ${muiTabs} Material-UI tab elements`);
    
    // Test functionality summary
    const hasDataSources = dataSources > 0;
    const hasGmailTab = gmailTab > 0;
    const hasTextMessagesTab = textMessagesTab > 0;
    const hasFilesTab = filesTab > 0;
    const hasTabsStructure = tabsElements > 0 || muiTabs > 0;
    
    console.log('\\n📋 FEATURE VERIFICATION:');
    console.log(`✅ Data Sources Section: ${hasDataSources ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`✅ Gmail Tab: ${hasGmailTab ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`✅ Text Messages Tab: ${hasTextMessagesTab ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`✅ Files Tab: ${hasFilesTab ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`✅ Tabs Structure: ${hasTabsStructure ? 'FOUND' : 'NOT FOUND'}`);
    
    const featuresFound = [hasDataSources, hasGmailTab, hasTextMessagesTab, hasFilesTab, hasTabsStructure].filter(Boolean).length;
    console.log(`\\n🎯 IMPLEMENTATION STATUS: ${featuresFound}/5 features detected`);
    
    if (featuresFound >= 4) {
      console.log('✅ DATA SOURCES TABS SUCCESSFULLY IMPLEMENTED');
    } else {
      console.log('❌ DATA SOURCES TABS NEED ATTENTION');
    }
    
    // Keep browser open for manual inspection
    console.log('\\n⏱️  Keeping browser open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Test execution error:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testDataSourcesTabs().catch(console.error);