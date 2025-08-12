const puppeteer = require('puppeteer');
const path = require('path');

async function measureAndAdjustCards() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1200, height: 800 }
  });

  try {
    const page = await browser.newPage();
    
    console.log('🌐 Navigating to Communications page...');
    await page.goto('http://localhost:4001', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Wait for React to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if we need to skip sign-in (debug mode)
    console.log('🔓 Checking for debug sign-in...');
    try {
      const debugButton = await page.$('text=Skip Sign-In');
      if (debugButton) {
        console.log('🔓 Clicking debug skip sign-in...');
        await page.click('text=Skip Sign-In');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.log('No debug sign-in found, continuing...');
    }
    
    // Click on Communications nav item
    console.log('🖱️ Navigating to Communications section...');
    try {
      await page.click('text=Communications');
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log('Could not click Communications, checking if already on page');
    }

    // Wait for any cards to load (more flexible selector)
    console.log('⏳ Waiting for page content to load...');
    await page.waitForSelector('div, .MuiCard-root, .MuiGrid-item', { timeout: 10000 });
    
    console.log('📐 Taking initial screenshot...');
    await page.screenshot({ 
      path: path.join(__dirname, 'before-measurement.png'),
      fullPage: false 
    });

    // Debug: Check what's on the page
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        cardsFound: document.querySelectorAll('.MuiCard-root').length,
        gridsFound: document.querySelectorAll('.MuiGrid-container').length,
        bodyContent: document.body.innerText.substring(0, 500)
      };
    });
    
    console.log('🔍 Page debug info:', pageContent);

    // Measure the current height of the stats cards row
    const cardRowHeight = await page.evaluate(() => {
      // Look for the stats cards container - try multiple strategies
      let statsContainer = document.querySelector('[data-testid="stats-cards"]');
      
      if (!statsContainer) {
        // Look for a grid container that contains cards
        const gridContainers = document.querySelectorAll('.MuiGrid-container');
        for (let container of gridContainers) {
          if (container.querySelectorAll('.MuiCard-root').length >= 4) {
            statsContainer = container;
            break;
          }
        }
      }
      
      if (!statsContainer) {
        console.log('Stats container not found, checking for individual cards...');
        const cards = document.querySelectorAll('.MuiCard-root');
        if (cards.length > 0) {
          // Find the first 4 cards that are likely stats cards
          const statsCards = Array.from(cards).slice(0, 4);
          const maxHeight = Math.max(...statsCards.map(card => card.offsetHeight));
          return {
            height: maxHeight,
            containerFound: false,
            cardCount: cards.length,
            selector: '.MuiCard-root',
            strategy: 'individual-cards'
          };
        }
        return { height: 0, containerFound: false, error: 'No cards found' };
      }

      return {
        height: statsContainer.offsetHeight,
        containerFound: true,
        selector: statsContainer.className,
        strategy: 'container'
      };
    });

    console.log('📏 Current card row measurements:', cardRowHeight);

    if (cardRowHeight.height === 0) {
      console.error('❌ Could not measure card height - elements not found');
      await page.screenshot({ 
        path: path.join(__dirname, 'debug-page.png'),
        fullPage: true 
      });
      return;
    }

    const currentHeight = cardRowHeight.height;
    const targetHeight = Math.round(currentHeight / 2);
    
    console.log(`🎯 Target height: ${targetHeight}px (half of ${currentHeight}px)`);

    // Inject CSS to make cards exactly half height
    await page.addStyleTag({
      content: `
        .MuiCard-root {
          max-height: ${targetHeight}px !important;
          min-height: ${targetHeight}px !important;
        }
        .MuiCardContent-root {
          padding: 4px 8px !important;
          min-height: ${targetHeight - 8}px !important;
          max-height: ${targetHeight - 8}px !important;
        }
        .MuiCardContent-root:last-child {
          padding-bottom: 4px !important;
        }
        .MuiCardContent-root .MuiBox-root:first-of-type {
          width: 20px !important;
          height: 20px !important;
          min-width: 20px !important;
        }
        .MuiCardContent-root .MuiTypography-h6 {
          font-size: 0.875rem !important;
          line-height: 1 !important;
          margin-bottom: 1px !important;
        }
        .MuiCardContent-root .MuiTypography-caption {
          font-size: 0.6rem !important;
          line-height: 0.8 !important;
        }
      `
    });

    // Wait a moment for CSS to apply
    await new Promise(resolve => setTimeout(resolve, 500));

    // Measure the new height
    const newCardRowHeight = await page.evaluate(() => {
      const statsContainer = document.querySelector('[data-testid="stats-cards"]') || 
                            document.querySelector('.MuiGrid-container') ||
                            document.querySelector('.MuiCard-root');
      
      if (!statsContainer) return { height: 0, error: 'No container found' };

      return {
        height: statsContainer.offsetHeight,
        cardHeight: document.querySelector('.MuiCard-root')?.offsetHeight || 0
      };
    });

    console.log('📐 New measurements:', newCardRowHeight);
    console.log(`✅ Height reduction: ${currentHeight}px → ${newCardRowHeight.height}px (${Math.round((1 - newCardRowHeight.height/currentHeight) * 100)}% reduction)`);

    // Take final screenshot
    await page.screenshot({ 
      path: path.join(__dirname, 'after-measurement.png'),
      fullPage: false 
    });

    console.log('📸 Screenshots saved:');
    console.log('  - before-measurement.png');
    console.log('  - after-measurement.png');

    // Generate the actual CSS to implement
    const cssToImplement = `
// Reduce StatCard height to exactly ${targetHeight}px
<CardContent sx={{ 
  display: 'flex', 
  alignItems: 'center', 
  gap: 0.5, 
  py: 0.5, 
  px: 1,
  minHeight: '${targetHeight - 8}px',
  maxHeight: '${targetHeight - 8}px',
  '&:last-child': { pb: 0.5 }
}}>
  <Box sx={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    borderRadius: 0.5,
    backgroundColor: \`\${color}20\`,
    color: color,
    flexShrink: 0
  }}>
    {icon}
  </Box>
  <Box sx={{ minWidth: 0, flex: 1 }}>
    <Typography variant="body1" fontWeight="bold" color="text.primary" sx={{ lineHeight: 1, mb: 0.05, fontSize: '0.875rem' }}>
      {value}
    </Typography>
    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 0.8, fontSize: '0.6rem' }}>
      {title}
    </Typography>
  </Box>
`;

    console.log('💡 Suggested CSS implementation:');
    console.log(cssToImplement);

    return {
      originalHeight: currentHeight,
      newHeight: newCardRowHeight.height,
      targetHeight,
      reductionPercentage: Math.round((1 - newCardRowHeight.height/currentHeight) * 100),
      success: true
    };

  } catch (error) {
    console.error('❌ Error during measurement:', error);
    
    // Take debug screenshot on error
    try {
      const page = browser.pages()[0];
      await page.screenshot({ 
        path: path.join(__dirname, 'error-debug.png'),
        fullPage: true 
      });
      console.log('📸 Debug screenshot saved: error-debug.png');
    } catch (screenshotError) {
      console.error('Could not take debug screenshot:', screenshotError);
    }

    throw error;
  } finally {
    await browser.close();
  }
}

// Run the measurement
if (require.main === module) {
  measureAndAdjustCards()
    .then(result => {
      if (result) {
        console.log('🎉 Measurement complete!');
        console.log(`📊 Results: ${result.originalHeight}px → ${result.newHeight}px (${result.reductionPercentage}% reduction)`);
      }
    })
    .catch(error => {
      console.error('💥 Measurement failed:', error.message);
      process.exit(1);
    });
}

module.exports = { measureAndAdjustCards };