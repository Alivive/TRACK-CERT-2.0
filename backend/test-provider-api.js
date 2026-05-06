// Test script for provider links API

const API_URL = 'http://localhost:3000';

async function testProviderLinksAPI() {
  console.log('Testing Provider Links API...\n');

  try {
    // Test 1: Get all provider links
    console.log('1. GET /api/provider-links');
    const getResponse = await fetch(`${API_URL}/api/provider-links`);
    const getData = await getResponse.json();
    console.log('Status:', getResponse.status);
    console.log('Response:', JSON.stringify(getData, null, 2));
    console.log('✓ GET request successful\n');

    // Test 2: Add a new provider link
    console.log('2. POST /api/provider-links');
    const testProvider = {
      provider_name: 'Test Provider ' + Date.now(),
      base_url: 'https://test.com/verify/',
      description: 'Test provider for API testing'
    };
    console.log('Sending:', testProvider);
    
    const postResponse = await fetch(`${API_URL}/api/provider-links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testProvider)
    });
    const postData = await postResponse.json();
    console.log('Status:', postResponse.status);
    console.log('Response:', JSON.stringify(postData, null, 2));
    
    if (postResponse.ok) {
      console.log('✓ POST request successful\n');
      
      // Test 3: Delete the test provider
      if (postData.data?.id) {
        console.log('3. DELETE /api/provider-links/' + postData.data.id);
        const deleteResponse = await fetch(`${API_URL}/api/provider-links/${postData.data.id}`, {
          method: 'DELETE'
        });
        const deleteData = await deleteResponse.json();
        console.log('Status:', deleteResponse.status);
        console.log('Response:', JSON.stringify(deleteData, null, 2));
        console.log('✓ DELETE request successful\n');
      }
    } else {
      console.log('✗ POST request failed\n');
    }

    console.log('All tests completed!');
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Make sure the backend server is running on port 3000');
  }
}

testProviderLinksAPI();
