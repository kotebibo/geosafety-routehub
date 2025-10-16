/**
 * Add Test Coordinates - Spread companies across Tbilisi
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.join(__dirname, '..', 'apps', 'web', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const tbilisiCoords = [
  { lat: 41.7151, lng: 44.8271 }, // Center
  { lat: 41.7250, lng: 44.8100 }, // Saburtalo
  { lat: 41.7100, lng: 44.7950 }, // Vake
  { lat: 41.6980, lng: 44.8340 }, // Old Town
  { lat: 41.7320, lng: 44.7780 }, // Digomi
  { lat: 41.7050, lng: 44.8650 }, // Avlabari
  { lat: 41.6890, lng: 44.8150 }, // Mtatsminda
  { lat: 41.7410, lng: 44.8190 }, // Gldani
  { lat: 41.7180, lng: 44.7680 }, // Vazisubani
  { lat: 41.6950, lng: 44.8480 }, // Isani
  { lat: 41.7290, lng: 44.7980 }, // Didi Dighomi
  { lat: 41.7080, lng: 44.7850 }, // Vera
  { lat: 41.7430, lng: 44.8350 }, // Temka
  { lat: 41.6870, lng: 44.8250 }, // Sololaki
  { lat: 41.7200, lng: 44.8450 }, // Navtlughi
  { lat: 41.7340, lng: 44.7650 }, // Lisi
  { lat: 41.7020, lng: 44.8550 }, // Ortachala
  { lat: 41.7160, lng: 44.7750 }, // Nutsubidze
  { lat: 41.6920, lng: 44.8380 }, // Avlabar
  { lat: 41.7270, lng: 44.8520 }, // Samgori
];

async function addTestCoordinates() {
  console.log('📍 Adding test coordinates...\n');
  
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .order('name')
    .limit(20);
  
  if (!companies) return;
  
  for (let i = 0; i < companies.length; i++) {
    const coords = tbilisiCoords[i];
    await supabase
      .from('companies')
      .update({ lat: coords.lat, lng: coords.lng })
      .eq('id', companies[i].id);
    console.log(`✅ ${i + 1}/20`);
  }
  
  console.log('\n🎉 Done!');
}

addTestCoordinates();
