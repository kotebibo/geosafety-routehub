/**
 * Quick script to check company coordinates
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkCoordinates() {
  const { data, error } = await supabase
    .from('companies')
    .select('name, address, lat, lng')
    .eq('city', 'თბილისი')
    .order('lat')
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('First 20 companies by latitude:');
  console.log('='.repeat(80));

  const coordMap = new Map();
  
  data?.forEach(company => {
    const key = `${company.lat},${company.lng}`;
    if (!coordMap.has(key)) {
      coordMap.set(key, []);
    }
    coordMap.get(key).push(company);
    
    console.log(`${company.name.substring(0, 40).padEnd(40)} | ${company.lat}, ${company.lng}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('Duplicate coordinates:');
  console.log('='.repeat(80));

  let duplicates = 0;
  for (const [coords, companies] of coordMap.entries()) {
    if (companies.length > 1) {
      duplicates += companies.length;
      console.log(`\n📍 ${coords} (${companies.length} companies):`);
      companies.forEach(c => console.log(`  - ${c.name}`));
    }
  }

  console.log(`\nTotal companies with duplicate coordinates: ${duplicates}`);
}

checkCoordinates();
