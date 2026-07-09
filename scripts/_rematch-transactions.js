/**
 * Reset all auto-matched transactions to unmatched, then re-run matching
 * with the new board-based logic (migration 084).
 *
 * Manual matches (match_method = 'manual') are preserved.
 * Run AFTER applying migration 084 to all instances.
 *
 * Usage: node scripts/_rematch-transactions.js [team1|team2|team3]
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/web/.env.local' });

const instances = [
  {
    name: 'team1',
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_KEY,
  },
  {
    name: 'team2',
    url: process.env.NEXT_PUBLIC_SUPABASE_URL_TEAM2,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY_TEAM2,
  },
  {
    name: 'team3',
    url: process.env.NEXT_PUBLIC_SUPABASE_URL_TEAM3,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY_TEAM3,
  },
];

const target = process.argv[2];

async function rematch(inst) {
  if (!inst.url || !inst.key) {
    console.log(`  ${inst.name}: SKIPPED (no credentials)`);
    return;
  }

  const supabase = createClient(inst.url, inst.key);

  // 1. Count current auto-matched transactions
  const { count: autoMatchedCount } = await supabase
    .from('bank_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'matched')
    .neq('match_method', 'manual')
    .neq('match_method', 'inn_board');

  console.log(`  ${inst.name}: ${autoMatchedCount || 0} old auto-matched transactions to reset`);

  // 2. Reset old auto-matched to unmatched (preserve manual + inn_board matches)
  let resetCount = 0;
  let page = 0;
  const PAGE = 500;
  while (true) {
    const { data: batch } = await supabase
      .from('bank_transactions')
      .select('id')
      .eq('status', 'matched')
      .neq('match_method', 'manual')
      .neq('match_method', 'inn_board')
      .range(page, page + PAGE - 1);

    if (!batch || batch.length === 0) break;

    const ids = batch.map(t => t.id);
    const { error } = await supabase
      .from('bank_transactions')
      .update({
        status: 'unmatched',
        matched_company_id: null,
        match_method: null,
        match_confidence: null,
      })
      .in('id', ids);

    if (error) {
      console.log(`    Error resetting batch: ${error.message}`);
      break;
    }
    resetCount += batch.length;
    // Don't increment page — next query will get the next batch since we changed status
  }

  console.log(`  ${inst.name}: Reset ${resetCount} transactions to unmatched`);

  // 3. Re-run matching with new board-based logic
  console.log(`  ${inst.name}: Re-matching...`);
  const { data: results, error: rematchErr } = await supabase.rpc('match_unmatched_transactions');
  if (rematchErr) {
    console.log(`  ${inst.name}: Re-match error: ${rematchErr.message}`);
    return;
  }

  const matched = (results || []).filter(r => r.result !== 'unmatched').length;
  const total = (results || []).length;
  console.log(`  ${inst.name}: Re-matched ${matched}/${total} transactions via board tax IDs`);
}

async function main() {
  console.log('Resetting auto-matches and re-matching via contract boards...\n');

  for (const inst of instances) {
    if (target && inst.name !== target) continue;
    try {
      await rematch(inst);
    } catch (e) {
      console.log(`  ${inst.name}: FAILED - ${e.message}`);
    }
    console.log('');
  }

  console.log('Done. Transactions are now only matched if their tax ID exists in a ხელშეკრულებ board.');
}

main();
