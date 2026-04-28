/**
 * BOG transaction ingestion and matching orchestration
 * Called by cron jobs to fetch, store, and match transactions
 */

import { createServiceClient } from '@/lib/supabase/server'
import { bogClient } from './client'
import type { BogTodayActivity, BogStatementRecord, BankTransactionInsert } from './types'

/**
 * Transform todayactivities response (Original API) to our DB format
 */
function transformTodayActivity(txn: BogTodayActivity): BankTransactionInsert {
  return {
    doc_key: txn.DocKey,
    entry_date: txn.EntryDate,
    doc_date: txn.DocDate || null,
    amount: txn.Credit || txn.Debit,
    currency: txn.Currency,
    sender_name: txn.Sender || null,
    sender_inn: txn.SenderInn || null,
    sender_account: txn.SenderAccountNumber || null,
    receiver_account: txn.ReceiverAccountNumber || null,
    purpose: txn.Nomination || null,
    raw_data: txn as unknown as Record<string, unknown>,
  }
}

/**
 * Transform statement/v2 response (Statement New API) to our DB format
 */
function transformStatementRecord(rec: BogStatementRecord): BankTransactionInsert {
  return {
    doc_key: rec.DocumentKey,
    entry_date: rec.EntryDate,
    doc_date: rec.DocumentDate || null,
    amount: rec.EntryAmountCredit || rec.EntryAmountDebit,
    currency: rec.Currency,
    sender_name: rec.SenderDetails || null,
    sender_inn: rec.SenderInn || null,
    sender_account: rec.SenderAccountNumber || null,
    receiver_account: rec.ReceiverAccountNumber || null,
    purpose: rec.DocumentNomination || null,
    raw_data: rec as unknown as Record<string, unknown>,
  }
}

/**
 * Upsert rows and run matching on newly inserted ones
 */
async function upsertAndMatch(
  rows: BankTransactionInsert[]
): Promise<{ inserted: number; matched: number }> {
  if (rows.length === 0) return { inserted: 0, matched: 0 }

  const supabase = createServiceClient() as any

  const { data: upserted, error: upsertError } = await supabase
    .from('bank_transactions')
    .upsert(rows, { onConflict: 'doc_key', ignoreDuplicates: true })
    .select('id, status')

  if (upsertError) throw upsertError

  const inserted = upserted?.length || 0

  // Run matching on newly inserted (unmatched) transactions
  const unmatchedIds = (upserted || [])
    .filter((r: any) => r.status === 'unmatched')
    .map((r: any) => r.id)

  let matched = 0
  for (const id of unmatchedIds) {
    const { data, error } = await supabase.rpc('match_bank_transaction', {
      p_transaction_id: id,
    })
    if (error) {
      console.error(`Failed to match transaction ${id}:`, error)
      continue
    }
    if (data && data !== 'unmatched') {
      matched++
    }
  }

  return { inserted, matched }
}

/**
 * Ingest today's transactions from BOG
 * Uses doc_key for idempotent upserts — safe to call repeatedly
 */
export async function ingestTodayTransactions(): Promise<{
  fetched: number
  inserted: number
  matched: number
}> {
  const transactions = await bogClient.getTodayActivities()
  const fetched = transactions.length

  if (fetched === 0) {
    return { fetched: 0, inserted: 0, matched: 0 }
  }

  const rows = transactions.map(transformTodayActivity)
  const { inserted, matched } = await upsertAndMatch(rows)

  return { fetched, inserted, matched }
}

/**
 * Ingest historical transactions for a date range
 */
export async function ingestHistoricalTransactions(
  fromDate: string,
  toDate: string
): Promise<{ fetched: number; inserted: number; matched: number }> {
  const records = await bogClient.getStatementForRange(fromDate, toDate)
  const fetched = records.length

  if (fetched === 0) {
    return { fetched: 0, inserted: 0, matched: 0 }
  }

  const rows = records.map(transformStatementRecord)
  const { inserted, matched } = await upsertAndMatch(rows)

  return { fetched, inserted, matched }
}

/**
 * Re-run matching on all unmatched transactions
 * Used by nightly reconciliation cron
 */
export async function reconcileUnmatched(): Promise<{
  processed: number
  matched: number
}> {
  const supabase = createServiceClient() as any

  const { data, error } = await supabase.rpc('match_unmatched_transactions')
  if (error) throw error

  const results = data || []
  const processed = results.length
  const matched = results.filter((r: { result: string }) => r.result !== 'unmatched').length

  return { processed, matched }
}

/**
 * Manually match a transaction to a company
 */
export async function manualMatch(
  transactionId: string,
  companyId: string,
  userId: string,
  notes?: string
): Promise<void> {
  const supabase = createServiceClient() as any

  // Update the transaction
  const { error: updateError } = await supabase
    .from('bank_transactions')
    .update({
      matched_company_id: companyId,
      match_method: 'manual',
      match_confidence: 1.0,
      status: 'matched',
    })
    .eq('id', transactionId)

  if (updateError) throw updateError

  // Create audit trail
  const { error: auditError } = await supabase.from('payment_matches').insert({
    transaction_id: transactionId,
    company_id: companyId,
    matched_by: userId,
    match_method: 'manual',
    confidence: 1.0,
    notes: notes || null,
  })

  if (auditError) throw auditError
}
