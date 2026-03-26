require('dotenv').config({ path: 'apps/web/.env.local' });
const { createClient } = require('@supabase/supabase-js');
const c = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_TEAM2,
  process.env.SUPABASE_SERVICE_ROLE_KEY_TEAM2
);
const BOARD = '0a33ecd3-62fe-4c37-b5f9-63b4941103e9';

async function main() {
  const { data: items } = await c.from('board_items').select('id, name, data').eq('board_id', BOARD);
  const { data: subitems } = await c.from('board_subitems').select('id, name, data, parent_item_id').eq('board_id', BOARD);
  const parentIdsWithSubs = new Set(subitems.map(s => s.parent_item_id));

  const locations = [];
  for (const si of subitems) {
    locations.push({ name: si.name, sb: si.data?.source_board, sg: si.data?.source_group });
  }
  for (const item of items) {
    if (parentIdsWithSubs.has(item.id)) continue;
    locations.push({ name: item.name, sb: item.data?.source_board, sg: item.data?.source_group });
  }

  // Get all unique source_board values and check which look like person names vs board names
  const allBoards = [...new Set(locations.map(l => l.sb || '(empty)'))];

  for (const board of allBoards) {
    const locs = locations.filter(l => l.sb === board);
    const groups = {};
    for (const l of locs) {
      const g = l.sg || '(empty)';
      if (!groups[g]) groups[g] = [];
      groups[g].push(l.name);
    }
    const groupNames = Object.keys(groups);
    // Show boards that have source_group values other than just "Group Title" or the board name
    console.log(`\n=== ${board} (${locs.length} locations) ===`);
    for (const [g, names] of Object.entries(groups)) {
      console.log(`  "${g}": ${names.length} items`);
    }
  }
}

main().catch(console.error);
