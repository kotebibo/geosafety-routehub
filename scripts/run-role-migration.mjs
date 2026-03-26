import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { config } from 'dotenv'

// Load env from apps/web/.env.local
config({ path: 'apps/web/.env.local' })

const SQL = readFileSync('supabase/migrations/071_rename_inspector_role_to_officer.sql', 'utf8')

const instances = [
  {
    name: 'Primary',
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_KEY,
  },
  {
    name: 'Team2',
    url: process.env.NEXT_PUBLIC_SUPABASE_URL_TEAM2,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY_TEAM2,
  },
]

for (const inst of instances) {
  console.log(`\n=== ${inst.name} (${inst.url}) ===`)
  if (!inst.url || !inst.key) {
    console.error(`  SKIP: missing URL or key`)
    continue
  }

  const supabase = createClient(inst.url, inst.key, {
    auth: { persistSession: false },
  })

  // Execute each SQL statement separately
  const statements = SQL
    .split(';')
    .map(s => s.replace(/--.*$/gm, '').trim())
    .filter(s => s.length > 0)

  for (const stmt of statements) {
    console.log(`  Running: ${stmt.substring(0, 80)}...`)
    const { data, error } = await supabase.rpc('exec_sql', { sql: stmt })
    if (error) {
      // Try via direct REST SQL endpoint
      console.log(`  rpc failed (${error.message}), trying direct update...`)
    } else {
      console.log(`  OK`)
    }
  }

  // Fallback: use table-level updates directly
  console.log(`\n  Applying updates via table API...`)

  // 1. custom_roles: rename inspector -> officer
  let res = await supabase.from('custom_roles').update({ name: 'officer', display_name: 'Officer' }).eq('name', 'inspector')
  console.log(`  custom_roles update:`, res.error ? `ERROR: ${res.error.message}` : `OK (count: ${res.count ?? 'n/a'})`)

  // Also handle case where officer already exists but inspector doesn't
  if (res.error && res.error.message.includes('duplicate')) {
    console.log(`  'officer' already exists in custom_roles, skipping`)
  }

  // 2. user_roles: inspector -> officer
  res = await supabase.from('user_roles').update({ role: 'officer' }).eq('role', 'inspector')
  console.log(`  user_roles update:`, res.error ? `ERROR: ${res.error.message}` : `OK (count: ${res.count ?? 'n/a'})`)

  // 3. role_permissions: role_name inspector -> officer
  res = await supabase.from('role_permissions').update({ role_name: 'officer' }).eq('role_name', 'inspector')
  console.log(`  role_permissions (role_name) update:`, res.error ? `ERROR: ${res.error.message}` : `OK (count: ${res.count ?? 'n/a'})`)

  // 4. permissions: pages:inspectors -> pages:officers
  res = await supabase.from('permissions').update({ name: 'pages:officers', action: 'officers', description: 'Access officers page' }).eq('name', 'pages:inspectors')
  console.log(`  permissions update:`, res.error ? `ERROR: ${res.error.message}` : `OK (count: ${res.count ?? 'n/a'})`)

  // 5. role_permissions: permission pages:inspectors -> pages:officers
  res = await supabase.from('role_permissions').update({ permission: 'pages:officers' }).eq('permission', 'pages:inspectors')
  console.log(`  role_permissions (permission) update:`, res.error ? `ERROR: ${res.error.message}` : `OK (count: ${res.count ?? 'n/a'})`)

  // Verify
  console.log(`\n  Verifying...`)
  const { data: roles } = await supabase.from('custom_roles').select('name, display_name')
  console.log(`  custom_roles:`, roles)

  const { data: userRoles } = await supabase.from('user_roles').select('role').in('role', ['inspector', 'officer'])
  console.log(`  user_roles with inspector/officer:`, userRoles)

  const { data: rolePerms } = await supabase.from('role_permissions').select('role_name, permission').in('role_name', ['inspector', 'officer'])
  console.log(`  role_permissions for inspector/officer:`, rolePerms)

  const { data: perms } = await supabase.from('permissions').select('name').in('name', ['pages:inspectors', 'pages:officers'])
  console.log(`  permissions (pages):`, perms)

  const { data: pagePerms } = await supabase.from('role_permissions').select('role_name, permission').in('permission', ['pages:inspectors', 'pages:officers'])
  console.log(`  role_permissions (page perms):`, pagePerms)
}

console.log('\nDone!')
