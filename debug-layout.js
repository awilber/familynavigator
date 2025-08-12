const puppeteer = require('puppeteer');

async function debugLayout() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 900 }
  });

  try {
    const page = await browser.newPage();
    
    console.log('🌐 Loading Family Navigator...');
    await page.goto('http://localhost:4001', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Skip sign-in
    try {
      await page.click('text=Skip Sign-In');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.log('No debug sign-in found');
    }
    
    // Navigate to Communications
    try {
      await page.click('text=Communications');
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log('Already on Communications page');
    }

    // Switch to Advanced mode
    try {
      await page.click('.MuiSelect-select');
      await new Promise(resolve => setTimeout(resolve, 500));
      await page.click('text=Advanced Mode');
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ Switched to Advanced mode');
    } catch (error) {
      console.log('Could not switch mode:', error.message);
    }

    // Debug layout positions
    const layoutInfo = await page.evaluate(() => {
      const results = [];
      
      // Find main container
      const mainContainer = document.querySelector('[role="main"], main, .MuiBox-root');
      if (mainContainer) {
        const rect = mainContainer.getBoundingClientRect();
        results.push(`Main Container: ${rect.height}px high, top: ${rect.top}, bottom: ${rect.bottom}`);
      }

      // Find Communications Hub header
      const header = document.querySelector('h4, h1, [role="heading"]');
      if (header && header.textContent.includes('Communications')) {
        const rect = header.getBoundingClientRect();
        results.push(`Header: "${header.textContent.trim()}" at top: ${rect.top}, bottom: ${rect.bottom}`);
      }

      // Find the insight alert
      const alert = document.querySelector('.MuiAlert-root');
      if (alert) {
        const rect = alert.getBoundingClientRect();
        results.push(`Alert: "${alert.textContent.trim().substring(0, 50)}..." at top: ${rect.top}, bottom: ${rect.bottom}`);
      }

      // Find stats cards
      const statsGrid = document.querySelector('.MuiGrid-container');
      if (statsGrid) {
        const rect = statsGrid.getBoundingClientRect();
        results.push(`Stats Grid: ${rect.height}px high, top: ${rect.top}, bottom: ${rect.bottom}`);
        
        const cards = statsGrid.querySelectorAll('.MuiCard-root');
        cards.forEach((card, i) => {
          const cardRect = card.getBoundingClientRect();
          const text = card.textContent.trim().substring(0, 30);
          results.push(`  Card ${i+1}: "${text}..." at top: ${cardRect.top}, bottom: ${cardRect.bottom}, height: ${cardRect.height}px`);
        });
      }

      // Find chart/overview
      const chart = document.querySelector('[class*="chart"], [class*="overview"], .recharts-wrapper');
      if (chart) {
        const rect = chart.getBoundingClientRect();
        results.push(`Chart: ${rect.height}px high, top: ${rect.top}, bottom: ${rect.bottom}`);
      }

      // Check viewport
      results.push(`Viewport: ${window.innerWidth}x${window.innerHeight}`);
      results.push(`Document height: ${document.documentElement.scrollHeight}`);
      results.push(`Scroll position: ${window.scrollY}`);

      return results;
    });

    console.log('\n🔍 LAYOUT DEBUG INFO:');
    layoutInfo.forEach(info => console.log(info));

    // Take detailed screenshot
    await page.screenshot({ 
      path: 'layout-debug.png',
      fullPage: true 
    });
    console.log('\n📸 Full page screenshot saved: layout-debug.png');

    // Check for overlapping elements
    const overlap = await page.evaluate(() => {
      const statsGrid = document.querySelector('.MuiGrid-container');
      const chart = document.querySelector('[class*="chart"], [class*="overview"], .recharts-wrapper');
      
      if (statsGrid && chart) {
        const statsRect = statsGrid.getBoundingClientRect();
        const chartRect = chart.getBoundingClientRect();
        
        const overlap = Math.max(0, statsRect.bottom - chartRect.top);
        return {
          statsBottom: statsRect.bottom,
          chartTop: chartRect.top,
          overlap: overlap,
          isOverlapping: overlap > 0
        };
      }
      return { error: 'Could not find elements' };
    });

    console.log('\n⚠️  OVERLAP CHECK:', overlap);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Keep browser open for manual inspection
    console.log('\n🔍 Browser kept open for manual inspection. Close manually when done.');
    // await browser.close();
  }
}

debugLayout().catch(console.error);