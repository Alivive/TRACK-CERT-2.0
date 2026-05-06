// Debug script to see provider name mismatches
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugProviders() {
  console.log('=== PROVIDER NAMES DEBUG ===\n');

  // Get all provider links
  const { data: providerLinks } = await supabase
    .from('provider_links')
    .select('provider_name')
    .order('provider_name');

  console.log('Provider Links in Database:');
  providerLinks.forEach(p => console.log(`  - "${p.provider_name}"`));

  // Get unique provider names from certifications
  const { data: certs } = await supabase
    .from('certifications')
    .select('provider');

  const uniqueProviders = [...new Set(certs.map(c => c.provider))].sort();

  console.log('\nProvider Names in Certifications:');
  uniqueProviders.forEach(p => console.log(`  - "${p}"`));

  // Find mismatches
  const providerLinkNames = new Set(providerLinks.map(p => p.provider_name.toLowerCase()));
  const mismatches = uniqueProviders.filter(p => !providerLinkNames.has(p.toLowerCase()));

  console.log('\nMismatched Providers (in certs but not in provider_links):');
  if (mismatches.length === 0) {
    console.log('  None - all providers match!');
  } else {
    mismatches.forEach(p => console.log(`  - "${p}"`));
  }
}

debugProviders();
