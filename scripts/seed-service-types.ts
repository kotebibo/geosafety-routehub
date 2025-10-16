/**
 * Seed Service Types
 * Creates default service types for the inspection system
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

interface ServiceType {
  name: string;
  name_ka: string;
  description: string;
  required_inspector_type: string;
  default_frequency_days: number;
}

const serviceTypes: ServiceType[] = [
  {
    name: 'Fire Safety Inspection',
    name_ka: 'სახანძრო უსაფრთხოების ინსპექტირება',
    description: 'Inspection of fire safety equipment, exits, alarms, and compliance with fire codes',
    required_inspector_type: 'fire_safety',
    default_frequency_days: 90,
  },
  {
    name: 'Health Inspection',
    name_ka: 'ჯანმრთელობის ინსპექტირება',
    description: 'Health and sanitation inspection for compliance with health regulations',
    required_inspector_type: 'health',
    default_frequency_days: 180,
  },
  {
    name: 'Building Code Inspection',
    name_ka: 'სამშენებლო კოდექსის ინსპექტირება',
    description: 'Structural integrity and building code compliance inspection',
    required_inspector_type: 'building',
    default_frequency_days: 365,
  },
  {
    name: 'Electrical Safety Inspection',
    name_ka: 'ელექტრო უსაფრთხოების ინსპექტირება',
    description: 'Electrical systems, wiring, and equipment safety inspection',
    required_inspector_type: 'electrical',
    default_frequency_days: 180,
  },
  {
    name: 'Food Safety Inspection',
    name_ka: 'სურსათის უსაფრთხოების ინსპექტირება',
    description: 'Food handling, storage, and kitchen sanitation inspection',
    required_inspector_type: 'food_safety',
    default_frequency_days: 90,
  },
  {
    name: 'Environmental Compliance',
    name_ka: 'გარემოსდაცვითი შესაბამისობა',
    description: 'Environmental regulations and waste management compliance',
    required_inspector_type: 'environmental',
    default_frequency_days: 180,
  },
  {
    name: 'Occupational Safety Inspection',
    name_ka: 'შრომის უსაფრთხოების ინსპექტირება',
    description: 'Workplace safety, equipment, and OSHA compliance',
    required_inspector_type: 'occupational',
    default_frequency_days: 180,
  },
  {
    name: 'General Inspection',
    name_ka: 'ზოგადი ინსპექტირება',
    description: 'General facility and compliance inspection',
    required_inspector_type: 'general',
    default_frequency_days: 90,
  },
];

async function seedServiceTypes() {
  console.log('='.repeat(80));
  console.log('SEEDING SERVICE TYPES');
  console.log('='.repeat(80));

  let success = 0;
  let failed = 0;

  for (const serviceType of serviceTypes) {
    try {
      const { data, error } = await supabase
        .from('service_types')
        .insert(serviceType)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          // Duplicate - try to update instead
          const { error: updateError } = await supabase
            .from('service_types')
            .update(serviceType)
            .eq('name', serviceType.name);

          if (updateError) {
            console.error(`❌ Failed to update ${serviceType.name}:`, updateError.message);
            failed++;
          } else {
            console.log(`✅ Updated: ${serviceType.name} (${serviceType.name_ka})`);
            success++;
          }
        } else {
          throw error;
        }
      } else {
        console.log(`✅ Created: ${serviceType.name} (${serviceType.name_ka})`);
        success++;
      }
    } catch (error: any) {
      console.error(`❌ Failed to seed ${serviceType.name}:`, error.message);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SEEDING COMPLETE');
  console.log('='.repeat(80));
  console.log(`✅ Success: ${success}/${serviceTypes.length}`);
  console.log(`❌ Failed: ${failed}/${serviceTypes.length}`);
  console.log('='.repeat(80));
}

seedServiceTypes().catch(console.error);
