require('dotenv').config({ path: 'apps/web/.env.local' });
const { createClient } = require('@supabase/supabase-js');
const c = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_TEAM2,
  process.env.SUPABASE_SERVICE_ROLE_KEY_TEAM2
);

const WORKSPACE_ID = 'ce4ac0c8-ccc2-4d36-88fe-4ca6c485a2ad';

const EXCLUDED_PATTERNS = [
  'შეწყვეტილ', 'შეჩერებულ', 'დასრულებულ', 'ერთჯერადი', 'კომპანიები',
];

// Also exclude entire boards that are terminated categories
const EXCLUDED_BOARD_SOURCES = [
  'შრომა -  შეწყვეტილები',
  'შეწყვეტილი/ დასრულებული GDP',
];

function matchesExcluded(name) {
  if (!name) return false;
  const lower = name.toLowerCase();
  return EXCLUDED_PATTERNS.some(p => lower.includes(p.toLowerCase()));
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  // Get all boards in workspace
  const { data: boards } = await c.from('boards').select('id, name').eq('workspace_id', WORKSPACE_ID);
  console.log('Boards in workspace:');
  for (const b of boards) console.log(`  ${b.id} | ${b.name}`);

  for (const board of boards) {
    console.log(`\n=== Processing: ${board.name} (${board.id}) ===`);

    // Check items
    const { data: items } = await c.from('board_items').select('id, name, data').eq('board_id', board.id);
    const { data: subitems } = await c.from('board_subitems').select('id, name, data, parent_item_id').eq('board_id', board.id);

    // Find items to delete: source_board or source_group matches excluded patterns
    const itemsToDelete = [];
    for (const item of items || []) {
      const sb = item.data?.source_board || '';
      const sg = item.data?.source_group || '';
      if (EXCLUDED_BOARD_SOURCES.includes(sb) || matchesExcluded(sb) || matchesExcluded(sg)) {
        itemsToDelete.push(item);
      }
    }

    // Find subitems to delete
    const subitemsToDelete = [];
    for (const si of subitems || []) {
      const sb = si.data?.source_board || '';
      const sg = si.data?.source_group || '';
      if (EXCLUDED_BOARD_SOURCES.includes(sb) || matchesExcluded(sb) || matchesExcluded(sg)) {
        subitemsToDelete.push(si);
      }
    }

    // Also delete subitems whose parent is being deleted
    const deletedParentIds = new Set(itemsToDelete.map(i => i.id));
    for (const si of subitems || []) {
      if (deletedParentIds.has(si.parent_item_id) && !subitemsToDelete.find(s => s.id === si.id)) {
        subitemsToDelete.push(si);
      }
    }

    console.log(`  Items: ${items?.length || 0} total, ${itemsToDelete.length} to delete`);
    console.log(`  Subitems: ${subitems?.length || 0} total, ${subitemsToDelete.length} to delete`);

    if (itemsToDelete.length > 0) {
      console.log('  Items to delete:');
      for (const item of itemsToDelete) {
        console.log(`    - ${item.name} (sb: ${item.data?.source_board}, sg: ${item.data?.source_group})`);
      }
    }
    if (subitemsToDelete.length > 0) {
      console.log('  Subitems to delete:');
      for (const si of subitemsToDelete) {
        console.log(`    - ${si.name} (sb: ${si.data?.source_board}, sg: ${si.data?.source_group})`);
      }
    }

    if (!dryRun) {
      // Delete subitems first
      if (subitemsToDelete.length > 0) {
        const ids = subitemsToDelete.map(s => s.id);
        for (let i = 0; i < ids.length; i += 100) {
          const batch = ids.slice(i, i + 100);
          const { error } = await c.from('board_subitems').delete().in('id', batch);
          if (error) console.error('  Error deleting subitems:', error.message);
        }
        console.log(`  Deleted ${subitemsToDelete.length} subitems`);
      }
      // Delete items
      if (itemsToDelete.length > 0) {
        const ids = itemsToDelete.map(i => i.id);
        for (let i = 0; i < ids.length; i += 100) {
          const batch = ids.slice(i, i + 100);
          const { error } = await c.from('board_items').delete().in('id', batch);
          if (error) console.error('  Error deleting items:', error.message);
        }
        console.log(`  Deleted ${itemsToDelete.length} items`);
      }
    }
  }

  console.log('\n' + (dryRun ? 'DRY RUN - no changes made' : 'Done!'));
}

main().catch(console.error);
