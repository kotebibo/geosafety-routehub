/**
 * Script to add Personal Data Protection service types to the database
 * Run this to create the 5 PDP phases as service types
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// The 5 PDP service types/phases
const pdpServiceTypes = [
  {
    name: 'Personal Data Initial Assessment',
    name_ka: 'პერსონალური მონაცემები - პირველადი შეფასება',
    description: 'Evaluate current data protection practices and identify gaps',
    description_ka: 'მონაცემთა დაცვის არსებული პრაქტიკის შეფასება',
    required_inspector_type: 'personal_data',
    default_frequency_days: 30,
    regulatory_requirement: true,
    is_active: true,
    sort_order: 1
  },
  {
    name: 'Personal Data Documentation',
    name_ka: 'პერსონალური მონაცემები - დოკუმენტაცია',
    description: 'Review and prepare required documentation',
    description_ka: 'საჭირო დოკუმენტაციის განხილვა და მომზადება',
    required_inspector_type: 'personal_data',
    default_frequency_days: 45,
    regulatory_requirement: true,
    is_active: true,
    sort_order: 2
  },
  {
    name: 'Data Protection Implementation',
    name_ka: 'მონაცემთა დაცვა - დანერგვა',
    description: 'Implementation of data protection measures',
    description_ka: 'მონაცემთა დაცვის ზომების დანერგვა',
    required_inspector_type: 'personal_data',
    default_frequency_days: 60,
    regulatory_requirement: true,
    is_active: true,
    sort_order: 3
  },
  {
    name: 'Personal Data Training',
    name_ka: 'პერსონალური მონაცემები - ტრენინგი',
    description: 'Staff training on data protection',
    description_ka: 'პერსონალის ტრენინგი მონაცემთა დაცვაზე',
    required_inspector_type: 'personal_data',
    default_frequency_days: 90,
    regulatory_requirement: true,
    is_active: true,
    sort_order: 4
  },
  {
    name: 'Personal Data Certification',
    name_ka: 'პერსონალური მონაცემები - სერტიფიცირება',
    description: 'Final audit and certification',
    description_ka: 'საბოლოო აუდიტი და სერტიფიცირება',
    required_inspector_type: 'personal_data',
    default_frequency_days: 365,
    regulatory_requirement: true,
    is_active: true,
    sort_order: 5
  }
];

async function addPDPServiceTypes() {
  console.log('Adding Personal Data Protection service types...');
  
  try {
    // Insert all service types
    const { data, error } = await supabase
      .from('service_types')
      .insert(pdpServiceTypes)
      .select();
    
    if (error) {
      console.error('Error inserting service types:', error);
      return;
    }
    
    console.log('✅ Successfully added', data?.length, 'PDP service types:');
    data?.forEach(st => {
      console.log(`  - ${st.name_ka} (${st.name})`);
    });
    
  } catch (error) {
    console.error('Failed to add service types:', error);
  }
}

// Run the script
addPDPServiceTypes();