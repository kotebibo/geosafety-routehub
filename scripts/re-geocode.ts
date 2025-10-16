/**
 * Re-geocode Companies Script
 * Uses Nominatim (OpenStreetMap) to get accurate coordinates
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
const envPath = path.join(__dirname, '../apps/web/.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    envVars[key] = value;
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_KEY
);

// Nominatim API (free, no API key needed)
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

interface Company {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

function cleanStreetName(address: string): string | null {
  if (!address) return null;

  // Remove city prefix
  let cleaned = address
    .replace(/ქ\.თბილისი,?/g, '')
    .replace(/თბილისი,?/g, '')
    .replace(/ბათუმი,?/g, '')
    .trim();

  // Extract street name (before numbers)
  const patterns = [
    /([ა-ჰ\s]+(?:გამზ\.|ქ\.|ქუჩა|გამზირი))/,
    /([ა-ჰ\s]+)\s+[#№N\d]/,
    /([ა-ჰ\s]+),/,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match && match[1].length > 5) {
      return match[1].trim();
    }
  }

  // Fallback: take first part
  const parts = cleaned.split(',')[0].split('#')[0].split('№')[0];
  return parts.length > 5 ? parts.trim() : null;
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const street = cleanStreetName(address);
  
  if (!street) {
    console.log(`❌ No street extracted from: ${address.substring(0, 50)}`);
    return null;
  }

  try {
    // Determine city from address
    const city = address.includes('ბათუმი') ? 'Batumi' : 'Tbilisi';
    
    const query = `${street}, ${city}, Georgia`;
    const url = `${NOMINATIM_BASE_URL}/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GeoSafety-RouteHub/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const result = data[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);

      // Validate bounds (Tbilisi: 41.6-41.8, 44.7-44.9 / Batumi: 41.6-41.7, 41.6-41.7)
      const isValidTbilisi = lat > 41.6 && lat < 41.8 && lng > 44.7 && lng < 44.9;
      const isValidBatumi = lat > 41.6 && lat < 41.7 && lng > 41.6 && lng < 41.7;

      if (isValidTbilisi || isValidBatumi) {
        console.log(`✅ ${street.substring(0, 30)} → ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        return { lat, lng };
      }
    }

    console.log(`⚠️ No valid result for: ${street.substring(0, 30)}`);
    return null;

  } catch (error) {
    console.error(`❌ Error geocoding ${address.substring(0, 30)}:`, error);
    return null;
  }
}

async function reGeocodeCompanies() {
  console.log('='.repeat(80));
  console.log('RE-GEOCODING COMPANIES WITH NOMINATIM');
  console.log('='.repeat(80));

  // Get all companies
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, address, lat, lng')
    .order('name');

  if (error || !companies) {
    console.error('Failed to fetch companies:', error);
    return;
  }

  console.log(`\nTotal companies: ${companies.length}`);
  console.log('Starting geocoding...\n');

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];

    // Skip if address is empty or just city name
    if (!company.address || company.address.length < 10 || company.address.includes('@')) {
      console.log(`⏭️  Skipping ${company.name} (no valid address)`);
      skipped++;
      continue;
    }

    const coords = await geocodeAddress(company.address);

    if (coords) {
      // Update in database
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          lat: coords.lat,
          lng: coords.lng,
        })
        .eq('id', company.id);

      if (updateError) {
        console.error(`❌ Failed to update ${company.name}:`, updateError);
        failed++;
      } else {
        success++;
      }
    } else {
      failed++;
    }

    // Rate limit: 1 request per second (Nominatim policy)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Progress update every 10
    if ((i + 1) % 10 === 0) {
      console.log(`\n📊 Progress: ${i + 1}/${companies.length} | Success: ${success} | Failed: ${failed} | Skipped: ${skipped}\n`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('GEOCODING COMPLETE');
  console.log('='.repeat(80));
  console.log(`✅ Success: ${success} (${(success / companies.length * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failed} (${(failed / companies.length * 100).toFixed(1)}%)`);
  console.log(`⏭️  Skipped: ${skipped} (${(skipped / companies.length * 100).toFixed(1)}%)`);
  console.log('='.repeat(80));
}

// Run the script
reGeocodeCompanies().catch(console.error);
