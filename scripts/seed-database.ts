/**
 * Database Seed Script
 * Populates database with real company data
 * Run with: npm run seed:db
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface CompanyDataInput {
  name: string;
  identificationNumber: string;
  category: string;
  activity: string;
  generalStatus: string;
  address?: string;
  city?: string;
  contact?: string;
  email?: string;
  director?: string;
  salesRep?: string;
  lastVisit?: string;
}

async function seedCompanies() {
  // Load real company data
  const dataPath = path.join(process.cwd(), 'data', 'seeds', 'real-company-data.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Company data file not found. Run npm run import-data first!');
    process.exit(1);
  }
  
  const { companies, stats } = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  console.log(`\n🌱 Seeding ${companies.length} companies to database...\n`);
  
  // Map company data to database schema
  const companyRecords = companies.map((company: CompanyDataInput) => ({
    name: company.name,
    address: `${company.address || ''}, ${company.city || 'თბილისი'}`.trim(),
    type: mapActivityToType(company.activity),
    contact_name: company.director || company.contact || '',
    contact_phone: extractPhone(company.contact || ''),
    contact_email: company.email || '',
    status: mapStatus(company.generalStatus),
    priority: company.category?.includes('პრემიუმ') ? 'high' : 'medium',
    notes: [
      company.identificationNumber ? `Tax ID: ${company.identificationNumber}` : '',
      company.category ? `Category: ${company.category}` : '',
      company.salesRep ? `Sales Rep: ${company.salesRep}` : ''
    ].filter(Boolean).join(' | '),
    // Default location for Tbilisi (will be updated with real coordinates later)
    lat: 41.7151,
    lng: 44.8271,
  }));
  
  // Insert in batches to avoid timeout
  const batchSize = 50;
  let inserted = 0;
  
  for (let i = 0; i < companyRecords.length; i += batchSize) {
    const batch = companyRecords.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('companies')
      .insert(batch)
      .select();
    
    if (error) {
      console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error);
    } else {
      inserted += data?.length || 0;
      console.log(`✅ Inserted batch ${i / batchSize + 1}/${Math.ceil(companyRecords.length / batchSize)} (${inserted}/${companyRecords.length})`);
    }
  }
  
  console.log(`\n✨ Successfully seeded ${inserted} companies!`);
  console.log(`\n📊 Statistics:`);
  console.log(`  Total in database: ${inserted}`);
  console.log(`  By Category: ${JSON.stringify(stats.byCategory, null, 2)}`);
  console.log(`  By City: ${JSON.stringify(stats.byCity, null, 2)}`);
}

// Helper functions to map data
function mapCategory(category: string): string {
  const mapping: Record<string, string> = {
    'ქორფ': 'corporate',
    'ბლექ': 'blacklist',
    'ჯეო': 'geo',
    'პრემიუმ სეიფთი': 'premium_safety',
    'სეიფთი ქორფ': 'safety_corporate',
  };
  
  for (const [key, value] of Object.entries(mapping)) {
    if (category.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  
  return 'standard';
}

function mapActivityToType(activity: string): string {
  if (!activity) return 'commercial';
  
  const types: Record<string, string> = {
    'კლინიკა': 'healthcare',
    'სკოლა': 'education',
    'უნივერსიტეტი': 'education',
    'საბავშვო ბაღი': 'education',
    'საგანმანათლებლო': 'education',
    'სამშენებლო': 'industrial',
    'სამორინე': 'industrial',
  };
  
  for (const [key, value] of Object.entries(types)) {
    if (activity.includes(key)) {
      return value;
    }
  }
  
  // Default to commercial for offices, restaurants, hotels, casinos, etc.
  return 'commercial';
}

function mapStatus(status: string): string {
  if (!status) return 'active';
  
  const statusLower = status.toLowerCase();
  if (statusLower.includes('პროცესშია') || statusLower.includes('process')) return 'active';
  if (statusLower.includes('დადასტურებული') || statusLower.includes('confirmed')) return 'active';
  if (statusLower.includes('არ არის') || statusLower.includes('inactive')) return 'inactive';
  if (statusLower.includes('pending')) return 'pending';
  
  return 'active';
}

function extractPhone(contact: string): string {
  // Extract first phone number from contact string
  const phoneMatch = contact.match(/(\+995\s?)?(\d{3})\s?(\d{2})\s?(\d{2})\s?(\d{2})/);
  return phoneMatch ? phoneMatch[0].replace(/\s/g, '') : contact.slice(0, 20);
}

// Run the seed script
seedCompanies().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
