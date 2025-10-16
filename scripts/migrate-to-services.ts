/**
 * Migrate Existing Companies to Service System
 * Creates default "General Inspection" service for all existing companies
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
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

async function migrateToServices() {
  console.log('='.repeat(80));
  console.log('MIGRATING COMPANIES TO SERVICE SYSTEM');
  console.log('='.repeat(80));

  // Step 1: Get the "General Inspection" service type ID
  const { data: generalService, error: serviceError } = await supabase
    .from('service_types')
    .select('id')
    .eq('name', 'General Inspection')
    .single();

  if (serviceError || !generalService) {
    console.error('❌ Failed to find General Inspection service type');
    console.error('Please run seed-service-types.ts first');
    return;
  }

  console.log(`✅ Found General Inspection service: ${generalService.id}`);

  // Step 2: Get all companies
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name, inspection_frequency, next_inspection_date, last_inspection_date');

  if (companiesError || !companies) {
    console.error('❌ Failed to fetch companies:', companiesError);
    return;
  }

  console.log(`\n📦 Found ${companies.length} companies to migrate\n`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const company of companies) {
    try {
      // Check if company already has this service
      const { data: existing } = await supabase
        .from('company_services')
        .select('id')
        .eq('company_id', company.id)
        .eq('service_type_id', generalService.id)
        .single();

      if (existing) {
        console.log(`⏭️  ${company.name} - already has service`);
        skipped++;
        continue;
      }

      // Calculate next inspection date if not set
      let nextDate = company.next_inspection_date;
      if (!nextDate && company.last_inspection_date) {
        const lastDate = new Date(company.last_inspection_date);
        const frequency = company.inspection_frequency || 90;
        lastDate.setDate(lastDate.getDate() + frequency);
        nextDate = lastDate.toISOString().split('T')[0];
      } else if (!nextDate) {
        // Default to 90 days from now
        const today = new Date();
        today.setDate(today.getDate() + 90);
        nextDate = today.toISOString().split('T')[0];
      }

      // Create company_service record
      const { error: insertError } = await supabase
        .from('company_services')
        .insert({
          company_id: company.id,
          service_type_id: generalService.id,
          inspection_frequency_days: company.inspection_frequency || 90,
          last_inspection_date: company.last_inspection_date,
          next_inspection_date: nextDate,
          priority: 'medium',
          status: 'active',
        });

      if (insertError) {
        throw insertError;
      }

      console.log(`✅ ${company.name}`);
      success++;

    } catch (error: any) {
      console.error(`❌ ${company.name}:`, error.message);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(80));
  console.log(`✅ Migrated: ${success}/${companies.length}`);
  console.log(`⏭️  Skipped: ${skipped}/${companies.length}`);
  console.log(`❌ Failed: ${failed}/${companies.length}`);
  console.log('='.repeat(80));

  // Summary
  console.log('\n📊 SUMMARY:');
  console.log(`   All companies now have at least one service (General Inspection)`);
  console.log(`   You can now:`);
  console.log(`   1. Add more service types to companies as needed`);
  console.log(`   2. Assign specific inspectors to each service`);
  console.log(`   3. Create service-specific routes`);
}

migrateToServices().catch(console.error);
