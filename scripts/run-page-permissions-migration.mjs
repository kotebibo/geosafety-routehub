import { createClient } from '@supabase/supabase-js';

const instances = [
  {
    name: 'Primary (Team 1)',
    url: 'https://rjnraabxbpvonhowdfuc.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqbnJhYWJ4YnB2b25ob3dkZnVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM5MDg4MiwiZXhwIjoyMDc0OTY2ODgyfQ.sznkahp94LAsnLh7h0HchEZPySMnnnEMcb86cM8YGSM',
  },
  {
    name: 'Team 2',
    url: 'https://isqbsavzjranpulbpmns.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzcWJzYXZ6anJhbnB1bGJwbW5zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc0NDk2MSwiZXhwIjoyMDg5MzIwOTYxfQ.fXwOqyiAsghmWgp6YzHbI8es9qwDYMjecqJZdvFdqZo',
  },
];

const permissions = [
  { name: 'pages:dashboard', resource: 'pages', action: 'dashboard', description: 'Access home/dashboard page', category: 'Pages' },
  { name: 'pages:news', resource: 'pages', action: 'news', description: 'Access news page', category: 'Pages' },
  { name: 'pages:analytics', resource: 'pages', action: 'analytics', description: 'Access analytics page', category: 'Pages' },
  { name: 'pages:tracking', resource: 'pages', action: 'tracking', description: 'Access live tracking page', category: 'Pages' },
  { name: 'pages:checkin', resource: 'pages', action: 'checkin', description: 'Access check-in page', category: 'Pages' },
  { name: 'pages:checkins_admin', resource: 'pages', action: 'checkins_admin', description: 'Access check-ins management page', category: 'Pages' },
  { name: 'pages:companies', resource: 'pages', action: 'companies', description: 'Access companies page', category: 'Pages' },
  { name: 'pages:inspectors', resource: 'pages', action: 'inspectors', description: 'Access inspectors page', category: 'Pages' },
  { name: 'pages:routes', resource: 'pages', action: 'routes', description: 'Access routes page', category: 'Pages' },
  { name: 'pages:route_builder', resource: 'pages', action: 'route_builder', description: 'Access route builder page', category: 'Pages' },
  { name: 'pages:assignments', resource: 'pages', action: 'assignments', description: 'Access assignments page', category: 'Pages' },
  { name: 'pages:user_management', resource: 'pages', action: 'user_management', description: 'Access user management page', category: 'Pages' },
  { name: 'pages:roles', resource: 'pages', action: 'roles', description: 'Access roles & permissions page', category: 'Pages' },
  { name: 'pages:settings', resource: 'pages', action: 'settings', description: 'Access settings page', category: 'Pages' },
];

const dispatcherPages = [
  'pages:dashboard', 'pages:news', 'pages:analytics', 'pages:tracking',
  'pages:checkins_admin', 'pages:companies', 'pages:inspectors',
  'pages:routes', 'pages:route_builder', 'pages:assignments', 'pages:settings',
];

const inspectorPages = [
  'pages:dashboard', 'pages:news', 'pages:checkin', 'pages:tracking', 'pages:settings',
];

async function runMigration(instance) {
  console.log(`\n=== ${instance.name} (${instance.url}) ===`);

  const supabase = createClient(instance.url, instance.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Insert permissions
  console.log('\n--- Inserting permissions ---');
  for (const perm of permissions) {
    const { data, error } = await supabase.from('permissions').upsert(perm, { onConflict: 'name', ignoreDuplicates: true });
    if (error) {
      console.log(`  [WARN] ${perm.name}: ${error.message}`);
    } else {
      console.log(`  [OK] ${perm.name}`);
    }
  }

  // 2. Insert dispatcher role_permissions
  console.log('\n--- Dispatcher role_permissions ---');
  for (const permName of dispatcherPages) {
    const entry = { role_name: 'dispatcher', permission: permName };
    const { error } = await supabase.from('role_permissions').upsert(entry, { onConflict: 'role_name,permission', ignoreDuplicates: true });
    if (error) {
      console.log(`  [WARN] dispatcher -> ${permName}: ${error.message}`);
    } else {
      console.log(`  [OK] dispatcher -> ${permName}`);
    }
  }

  // 3. Insert inspector role_permissions
  console.log('\n--- Inspector role_permissions ---');
  for (const permName of inspectorPages) {
    const entry = { role_name: 'inspector', permission: permName };
    const { error } = await supabase.from('role_permissions').upsert(entry, { onConflict: 'role_name,permission', ignoreDuplicates: true });
    if (error) {
      console.log(`  [WARN] inspector -> ${permName}: ${error.message}`);
    } else {
      console.log(`  [OK] inspector -> ${permName}`);
    }
  }

  // 4. Verify
  console.log('\n--- Verification ---');
  const { data: permCount } = await supabase.from('permissions').select('name').like('name', 'pages:%');
  console.log(`  Page permissions in DB: ${permCount?.length || 0}`);

  const { data: dispRP } = await supabase.from('role_permissions').select('permission').eq('role_name', 'dispatcher').like('permission', 'pages:%');
  console.log(`  Dispatcher page permissions: ${dispRP?.length || 0}`);

  const { data: inspRP } = await supabase.from('role_permissions').select('permission').eq('role_name', 'inspector').like('permission', 'pages:%');
  console.log(`  Inspector page permissions: ${inspRP?.length || 0}`);
}

async function main() {
  for (const instance of instances) {
    try {
      await runMigration(instance);
    } catch (err) {
      console.error(`\n[ERROR] ${instance.name}: ${err.message}`);
    }
  }
  console.log('\n=== All done ===');
}

main();
