// Test backfill endpoint
const API_URL = 'http://localhost:3000';

async function testBackfill() {
  console.log('Testing Provider Links Backfill...\n');

  try {
    console.log('POST /api/provider-links/backfill');
    const response = await fetch(`${API_URL}/api/provider-links/backfill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✓ Backfill completed successfully!');
      console.log(`  - Total certifications checked: ${result.data.total}`);
      console.log(`  - Updated: ${result.data.updated}`);
      console.log(`  - Skipped: ${result.data.skipped}`);
      console.log(`  - Errors: ${result.data.errors}`);
    } else {
      console.log('\n✗ Backfill failed');
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Make sure the backend server is running on port 3000');
  }
}

testBackfill();
