require('dotenv').config({ path: 'apps/web/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const primary = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const team2 = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL_TEAM2, process.env.SUPABASE_SERVICE_ROLE_KEY_TEAM2);

const TABLES = [
  'users', 'user_roles', 'role_permissions', 'workspaces', 'boards',
  'board_groups', 'board_items', 'board_subitems', 'board_columns',
  'board_subitem_columns', 'board_views', 'companies', 'routes',
  'inspectors', 'service_types', 'company_locations', 'notifications',
  'activity_log', 'user_preferences',
];

async function checkTable(client, table) {
  const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
  return { exists: !error, count, error: error?.message };
}

async function main() {
  console.log('TABLE'.padEnd(25), 'PRIMARY'.padEnd(20), 'TEAM2');
  console.log('-'.repeat(70));

  for (const t of TABLES) {
    const [p, t2] = await Promise.all([checkTable(primary, t), checkTable(team2, t)]);
    const pStatus = p.exists ? `EXISTS (${p.count})` : 'MISSING';
    const t2Status = t2.exists ? `EXISTS (${t2.count})` : 'MISSING';
    console.log(t.padEnd(25), pStatus.padEnd(20), t2Status);
  }

  // Check anon key availability for team2
  console.log('\n--- AUTH CHECK ---');
  const { data: authData, error: authErr } = await team2.auth.getSession();
  console.log('Auth accessible:', !authErr ? 'YES' : 'NO (' + authErr.message + ')');

  // Check RPC
  console.log('\n--- RPC CHECK ---');
  const { error: rpcErr } = await team2.rpc('upsert_user_profile', {
    p_user_id: '00000000-0000-0000-0000-000000000000',
    p_user_email: 'test@test.com',
    p_user_full_name: '',
    p_user_avatar_url: '',
  });
  console.log('upsert_user_profile:', rpcErr ? 'MISSING (' + rpcErr.message + ')' : 'EXISTS');
}

main().catch(console.error);
