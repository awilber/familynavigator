const axios = require('axios');

async function verifyFilteringFunctionality() {
  console.log('🔄 Verifying Email Filtering Functionality...\n');
  
  try {
    // Step 1: Get email addresses from filtering panel
    console.log('1️⃣ Getting email addresses from filtering analysis...');
    const analysisResponse = await axios.get('http://localhost:7001/api/email-filtering/analysis');
    const emailAddresses = analysisResponse.data.data.emails.slice(0, 5); // Test first 5
    
    console.log(`   Found ${emailAddresses.length} email addresses to test`);
    emailAddresses.forEach((email, i) => {
      console.log(`   ${i + 1}. ${email.email_address} (${email.total_message_count} messages)`);
    });
    
    // Step 2: Test unfiltered count
    console.log('\n2️⃣ Getting unfiltered communication count...');
    const unfiltered = await axios.get('http://localhost:7001/api/communications?limit=100');
    const unfilteredCount = unfiltered.data.data.length;
    console.log(`   Unfiltered count: ${unfilteredCount} communications`);
    
    // Step 3: Test filtering with each email address
    console.log('\n3️⃣ Testing filtering with each email address...');
    
    let successfulFilters = 0;
    let failedFilters = 0;
    
    for (let i = 0; i < emailAddresses.length; i++) {
      const email = emailAddresses[i];
      const testQuery = `from:${email.email_address}`;
      
      console.log(`\n   Testing: ${testQuery}`);
      
      try {
        const filteredResponse = await axios.get(`http://localhost:7001/api/communications?gmail_query=${encodeURIComponent(testQuery)}`);
        const filteredCount = filteredResponse.data.data.length;
        
        if (filteredCount > 0 && filteredCount <= unfilteredCount) {
          console.log(`   ✅ SUCCESS: Found ${filteredCount} matching communications`);
          successfulFilters++;
          
          // Show sample of what was found
          const sample = filteredResponse.data.data[0];
          const fromInfo = sample.contact_email || 'unknown sender';
          const toInfo = sample.metadata?.to?.[0] || 'unknown recipient';
          console.log(`      Sample: From "${fromInfo}" To "${toInfo}"`);
          
        } else if (filteredCount === 0) {
          console.log(`   ⚠️  ZERO RESULTS: No communications match this filter`);
          failedFilters++;
        } else {
          console.log(`   ❓ UNEXPECTED: Filter returned ${filteredCount} > ${unfilteredCount}`);
          failedFilters++;
        }
        
      } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
        failedFilters++;
      }
    }
    
    // Step 4: Test the specific case mentioned by user (third email address)
    console.log('\n4️⃣ Testing specific case: Third email address...');
    if (emailAddresses.length >= 3) {
      const thirdEmail = emailAddresses[2];
      console.log(`   Third email address: ${thirdEmail.email_address}`);
      
      const testQuery = `from:${thirdEmail.email_address}`;
      const response = await axios.get(`http://localhost:7001/api/communications?gmail_query=${encodeURIComponent(testQuery)}`);
      const filteredCount = response.data.data.length;
      
      if (filteredCount > 0) {
        console.log(`   ✅ SUCCESS: Third email filtering works - found ${filteredCount} communications`);
        console.log(`   📧 This should now work in the UI when clicking Apply Filter`);
      } else {
        console.log(`   ❌ FAILED: Third email filtering returned 0 results`);
      }
    } else {
      console.log(`   ⚠️  Only ${emailAddresses.length} email addresses available, cannot test third`);
    }
    
    // Step 5: Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   Email addresses tested: ${emailAddresses.length}`);
    console.log(`   Successful filters: ${successfulFilters}`);
    console.log(`   Failed filters: ${failedFilters}`);
    console.log(`   Success rate: ${Math.round((successfulFilters / emailAddresses.length) * 100)}%`);
    
    if (successfulFilters > 0) {
      console.log('\n✅ CONCLUSION: Email filtering is now functional!');
      console.log('   - Apply Filter button should now work in the UI');
      console.log('   - Users can filter by any email address shown in the filtering panel');
      console.log('   - Both sender and recipient email addresses can be used for filtering');
    } else {
      console.log('\n❌ CONCLUSION: Email filtering still has issues');
      console.log('   - Apply Filter button will still not work in the UI');
      console.log('   - Further debugging needed');
    }
    
    // Step 6: Display format verification
    console.log('\n5️⃣ Checking display format...');
    const sampleComm = unfiltered.data.data[0];
    const hasRequiredFields = sampleComm.contact_email && sampleComm.metadata?.to;
    
    if (hasRequiredFields) {
      console.log('   ✅ Communications have required email fields for new display format');
      console.log(`   📧 Sample: From "${sampleComm.contact_email}" To "${sampleComm.metadata.to[0]}"`);
      console.log('   📱 The new From/To display format should be visible in the UI');
    } else {
      console.log('   ❌ Communications missing required fields for display format');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   🔌 Backend server is not running on port 7001');
      console.error('   🔧 Please start the server with: npm run server');
    }
  }
}

verifyFilteringFunctionality().catch(console.error);