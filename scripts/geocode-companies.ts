/**
 * Geocode Companies Script
 * Gets real lat/lng for all companies using Nominatim (OpenStreetMap's free geocoding)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config({ path: path.join(__dirname, '..', 'apps', 'web', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Nominatim geocoding (free, no API key needed)
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // Add "Georgia" to help with accuracy
    const query = encodeURIComponent(`${address}, Georgia`);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GeoSafety-RouteHub/1.0' // Required by Nominatim
      }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Geocoding error for "${address}":`, error);
    return null;
  }
}

// Add small delay to respect rate limits (1 request per second)
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocodeAllCompanies() {
  console.log('🌍 Starting geocoding process...\n');
  
  // Get companies - LIMIT TO 20 FOR TESTING
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, address, lat, lng')
    .order('name')
    .limit(20); // Only first 20 for testing
  
  if (error || !companies) {
    console.error('❌ Error fetching companies:', error);
    return;
  }
  
  console.log(`📍 Found ${companies.length} companies to geocode\n`);
  
  let updated = 0;
  let failed = 0;
  let skipped = 0;
  
  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    
    // Skip if already has real coordinates (not default Tbilisi)
    if (company.lat !== 41.71510000 && company.lat !== null) {
      console.log(`⏭️  ${i + 1}/${companies.length} - Skipping ${company.name} (already geocoded)`);
      skipped++;
      continue;
    }
    
    console.log(`🔍 ${i + 1}/${companies.length} - Geocoding: ${company.name}`);
    console.log(`   Address: ${company.address}`);
    
    const coords = await geocodeAddress(company.address);
    
    if (coords) {
      // Update in database
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          lat: coords.lat,
          lng: coords.lng
        })
        .eq('id', company.id);
      
      if (updateError) {
        console.log(`   ❌ Failed to update: ${updateError.message}`);
        failed++;
      } else {
        console.log(`   ✅ Success: ${coords.lat}, ${coords.lng}`);
        updated++;
      }
    } else {
      console.log(`   ⚠️  No coordinates found`);
      failed++;
    }
    
    // Wait 1.5 seconds between requests (Nominatim rate limit)
    if (i < companies.length - 1) {
      await delay(1500);
    }
  }
  
  console.log('\n📊 Geocoding Complete!');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📍 Total: ${companies.length}`);
}

// Run it
geocodeAllCompanies().catch(console.error);
