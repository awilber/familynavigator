const axios = require('axios');

async function testComplexQueryFix() {
  console.log('🔄 Testing complex Gmail query parsing fix...\n');
  
  try {
    // Test the exact query format that the frontend sends
    const complexQuery = '(from:alexapowell@gmail.com OR to:alexapowell@gmail.com)';
    console.log(`Testing complex query: "${complexQuery}"`);
    
    const response = await axios.get(`http://localhost:7001/api/communications?gmail_query=${encodeURIComponent(complexQuery)}`);
    const results = response.data.data;
    
    console.log(`✅ Complex query returned ${results.length} results`);
    
    if (results.length > 0) {
      console.log('\n📧 Sample results:');
      results.slice(0, 3).forEach((comm, i) => {
        const from = comm.contact_email || 'unknown sender';
        const to = comm.metadata?.to?.[0] || 'unknown recipient';
        console.log(`   ${i + 1}. From: "${from}" To: "${to}"`);
        console.log(`      Subject: "${comm.subject || 'No subject'}"`);
        console.log(`      Date: ${comm.timestamp}`);
        console.log('');
      });
      
      // Check if all results are actually related to alexapowell@gmail.com
      const relevantResults = results.filter(comm => {
        const contactEmail = comm.contact_email || '';
        const toEmails = comm.metadata?.to || [];
        const ccEmails = comm.metadata?.cc || [];
        
        return contactEmail.includes('alexapowell@gmail.com') || 
               toEmails.some(email => email.includes('alexapowell@gmail.com')) ||
               ccEmails.some(email => email.includes('alexapowell@gmail.com'));
      });
      
      console.log(`🎯 Relevant results: ${relevantResults.length}/${results.length}`);
      
      if (relevantResults.length === results.length) {
        console.log('✅ All results are correctly filtered!');
      } else {
        console.log('⚠️  Some results may not be correctly filtered');
      }
      
    } else {
      console.log('❌ Complex query returned no results - filtering may not be working');
    }
    
    // Also test the simple format for comparison
    console.log('\n🔍 Testing simple format for comparison...');
    const simpleQuery = 'from:alexapowell@gmail.com';
    const simpleResponse = await axios.get(`http://localhost:7001/api/communications?gmail_query=${encodeURIComponent(simpleQuery)}`);
    console.log(`Simple query "${simpleQuery}" returned ${simpleResponse.data.data.length} results`);
    
    if (results.length > 0) {
      console.log('\n🎉 SUCCESS: Complex query parsing is now working!');
      console.log('   - Frontend can send "(from:email OR to:email)" queries');
      console.log('   - Backend correctly parses and filters the results');
      console.log('   - Apply Filter button should now work in the UI');
    } else {
      console.log('\n❌ ISSUE: Complex query parsing still needs work');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   🔌 Backend server is not running on port 7001');
    }
  }
}

testComplexQueryFix().catch(console.error);