require('dotenv').config({ path: 'apps/web/.env.local' });
const { createClient } = require('@supabase/supabase-js');
const c = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_TEAM2,
  process.env.SUPABASE_SERVICE_ROLE_KEY_TEAM2
);

const SOURCE_BOARD = '0a33ecd3-62fe-4c37-b5f9-63b4941103e9';
const WORKSPACE_ID = 'ce4ac0c8-ccc2-4d36-88fe-4ca6c485a2ad';
const OWNER_ID = '8a6c5fee-4621-4b98-99be-fe2e0ffd41e0';

// Boards to delete (previously created)
const OLD_BOARDS = [
  'f0fcff7d-6cef-4225-8ee8-0db4919bb0a8', // ინსპექტორები / ლოკაციები
  '50bbec98-9d10-409f-a62a-99a18779f1bb', // შემაჯამებელი
];

// Non-person board names — for these, use source_group as inspector
const NON_PERSON_BOARDS = new Set([
  'HACCP', 'ხელშეკრულებები', 'შრომა -  შეწყვეტილები', 'ჰიგიენა',
  'შეწყვეტილი/ დასრულებული GDP', 'ადგილზე მდგომი სპეციალისტები',
  'გაზომვები', 'გარემო', 'საკანალიზაციო',
]);

// Excluded group/board patterns (terminated, completed, generic)
const EXCLUDED_PATTERNS = [
  'შეწყვეტილ', 'შეჩერებულ', 'დასრულებულ', 'ერთჯერადი',
  'კომპანიები', 'Group Title',
];

function isExcluded(name) {
  if (!name) return true;
  const lower = name.toLowerCase();
  return EXCLUDED_PATTERNS.some(p => lower.includes(p.toLowerCase()));
}

// Also exclude entire boards that are terminated
const EXCLUDED_BOARDS = new Set([
  'შრომა -  შეწყვეტილები',
  'შეწყვეტილი/ დასრულებული GDP',
]);

const GROUP_COLORS = [
  '#579bfc', '#a25ddc', '#e2445c', '#00c875', '#fdab3d',
  '#ff158a', '#037f4c', '#66ccff', '#c4c4c4', '#7f5347',
  '#ff5ac4', '#cab641', '#9cd326', '#784bd1', '#0086c0',
  '#bb3354', '#175a63', '#bda8f0', '#a9bee8', '#68a1bd',
  '#f4a460', '#e8697d', '#7bc7a6', '#d5b05a', '#5c7eb5',
];

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  // Fetch subitems only
  const { data: subitems } = await c.from('board_subitems').select('id, name, data, parent_item_id').eq('board_id', SOURCE_BOARD);
  const { data: sourceColumns } = await c.from('board_columns').select('*').eq('board_id', SOURCE_BOARD).order('position');

  console.log('Total subitems:', subitems.length);

  // Determine inspector for each subitem
  const locations = [];
  let excluded = 0;

  for (const si of subitems) {
    const sb = si.data?.source_board || '';
    const sg = si.data?.source_group || '';

    // Skip entire excluded boards
    if (EXCLUDED_BOARDS.has(sb)) { excluded++; continue; }

    let inspector;
    if (NON_PERSON_BOARDS.has(sb)) {
      // For non-person boards, use source_group as inspector
      if (isExcluded(sg)) { excluded++; continue; }
      inspector = sg;
    } else {
      // For person-named boards, use source_board as inspector
      if (isExcluded(sb)) { excluded++; continue; }
      // But also check if the source_group indicates terminated
      if (isExcluded(sg) && sg !== 'Group Title') { excluded++; continue; }
      inspector = sb;
    }

    locations.push({
      name: si.name,
      data: si.data || {},
      inspector,
    });
  }

  console.log('After filtering:', locations.length, 'locations,', excluded, 'excluded');

  // Group by inspector
  const byInspector = new Map();
  for (const loc of locations) {
    if (!byInspector.has(loc.inspector)) byInspector.set(loc.inspector, []);
    byInspector.get(loc.inspector).push(loc);
  }

  const sorted = [...byInspector.entries()].sort((a, b) => b[1].length - a[1].length);

  console.log('\n=== INSPECTOR BREAKDOWN ===');
  for (const [name, locs] of sorted) {
    const total = locs.reduce((sum, l) => sum + (l.data.col_20 || 0), 0);
    console.log(`${name}: ${locs.length} locations, amount: ${Math.round(total * 100) / 100}`);
  }
  console.log(`\nTotal groups: ${sorted.length}`);
  console.log(`Total locations: ${locations.length}`);

  if (dryRun) {
    console.log('\nDRY RUN - no changes made');
    return;
  }

  // --- DELETE OLD BOARDS ---
  for (const boardId of OLD_BOARDS) {
    await c.from('board_items').delete().eq('board_id', boardId);
    await c.from('board_groups').delete().eq('board_id', boardId);
    await c.from('board_columns').delete().eq('board_id', boardId);
    await c.from('boards').delete().eq('id', boardId);
    console.log('Deleted old board:', boardId);
  }

  // --- CREATE BOARD 1: ინსპექტორები / ლოკაციები ---
  const { data: board1, error: b1Err } = await c.from('boards').insert({
    owner_id: OWNER_ID,
    board_type: 'companies',
    name: 'ინსპექტორები / ლოკაციები',
    description: 'ინსპექტორების მიხედვით დაჯგუფებული ლოკაციები',
    icon: 'board', color: 'primary', is_template: false, is_public: false,
    settings: { defaultView: 'table', permissions: { canEdit: [], canView: [] }, allowComments: true, allowActivityFeed: true },
    workspace_id: WORKSPACE_ID,
  }).select().single();
  if (b1Err) throw b1Err;
  console.log('\nCreated board 1:', board1.id);

  // Columns
  const colInserts = sourceColumns.map(col => ({
    board_id: board1.id, board_type: col.board_type, column_id: col.column_id,
    column_name: col.column_name, column_name_ka: col.column_name_ka,
    column_type: col.column_type, is_visible: col.is_visible, is_pinned: col.is_pinned,
    position: col.position, width: col.width, config: col.config,
  }));
  await c.from('board_columns').insert(colInserts);
  console.log('Created', colInserts.length, 'columns');

  // Groups
  const groupInserts = sorted.map(([name], idx) => ({
    board_id: board1.id, name, color: GROUP_COLORS[idx % GROUP_COLORS.length], position: idx,
  }));
  const { data: groups1 } = await c.from('board_groups').insert(groupInserts).select();
  console.log('Created', groups1.length, 'groups');

  const groupMap = new Map();
  for (const g of groups1) groupMap.set(g.name, g.id);

  // Items
  const allItems = [];
  for (const [inspector, locs] of sorted) {
    const gid = groupMap.get(inspector);
    for (let i = 0; i < locs.length; i++) {
      allItems.push({ board_id: board1.id, group_id: gid, name: locs[i].name, data: locs[i].data, position: i });
    }
  }
  const BATCH = 50;
  let count1 = 0;
  for (let i = 0; i < allItems.length; i += BATCH) {
    const batch = allItems.slice(i, i + BATCH);
    const { error } = await c.from('board_items').insert(batch);
    if (error) console.error('Batch error:', error.message);
    else count1 += batch.length;
  }
  console.log('Created', count1, 'items');

  // --- CREATE BOARD 2: შემაჯამებელი ---
  const { data: board2, error: b2Err } = await c.from('boards').insert({
    owner_id: OWNER_ID,
    board_type: 'companies',
    name: 'შემაჯამებელი',
    description: 'ინსპექტორების შემაჯამებელი მონაცემები',
    icon: 'board', color: 'primary', is_template: false, is_public: false,
    settings: { defaultView: 'table', permissions: { canEdit: [], canView: [] }, allowComments: true, allowActivityFeed: true },
    workspace_id: WORKSPACE_ID,
  }).select().single();
  if (b2Err) throw b2Err;
  console.log('\nCreated board 2:', board2.id);

  const sumCols = [
    { column_id: 'locations', column_name: 'ლოკაციები', column_name_ka: 'ლოკაციები', column_type: 'number', position: 0, width: 120 },
    { column_id: 'total_amount', column_name: 'აქტების თანხა (ჯამი)', column_name_ka: 'აქტების თანხა (ჯამი)', column_type: 'number', position: 1, width: 180 },
    { column_id: 'total_dgv', column_name: 'დღგ (ჯამი)', column_name_ka: 'დღგ (ჯამი)', column_type: 'number', position: 2, width: 140 },
    { column_id: 'total_invoice', column_name: 'ინვოისის თანხა (ჯამი)', column_name_ka: 'ინვოისის თანხა (ჯამი)', column_type: 'number', position: 3, width: 180 },
    { column_id: 'total_monthly', column_name: 'ყოველთვიური (ჯამი)', column_name_ka: 'ყოველთვიური (ჯამი)', column_type: 'number', position: 4, width: 170 },
    { column_id: 'pct_amount', column_name: 'წილი (%)', column_name_ka: 'წილი (%)', column_type: 'number', position: 5, width: 100 },
  ];
  await c.from('board_columns').insert(sumCols.map(col => ({
    board_id: board2.id, board_type: 'companies', ...col, is_visible: true, is_pinned: false, config: {},
  })));

  const { data: sumGroup } = await c.from('board_groups').insert({
    board_id: board2.id, name: 'ინსპექტორები', color: '#579bfc', position: 0,
  }).select().single();

  const grandTotal = sorted.reduce((sum, [, locs]) => sum + locs.reduce((s, l) => s + (l.data.col_20 || 0), 0), 0);

  const sumItems = sorted.map(([name, locs], idx) => {
    const totalAmount = locs.reduce((s, l) => s + (l.data.col_20 || 0), 0);
    const totalDgv = locs.reduce((s, l) => s + (l.data.col_21 || 0), 0);
    const totalInvoice = locs.reduce((s, l) => s + (l.data.col_17 || 0), 0);
    const totalMonthly = locs.reduce((s, l) => s + (l.data.col_13 || 0), 0);
    return {
      board_id: board2.id, group_id: sumGroup.id, name, position: idx,
      data: {
        locations: locs.length,
        total_amount: Math.round(totalAmount * 100) / 100,
        total_dgv: Math.round(totalDgv * 100) / 100,
        total_invoice: Math.round(totalInvoice * 100) / 100,
        total_monthly: Math.round(totalMonthly * 100) / 100,
        pct_amount: grandTotal > 0 ? Math.round((totalAmount / grandTotal) * 10000) / 100 : 0,
      },
    };
  });
  await c.from('board_items').insert(sumItems);
  console.log('Created', sumItems.length, 'summary items');

  console.log('\nDone!');
}

main().catch(console.error);
