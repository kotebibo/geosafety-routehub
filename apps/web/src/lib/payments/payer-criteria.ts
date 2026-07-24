/**
 * Manager-editable payer-categorization thresholds, stored as one JSON row in
 * app_settings (key below). Read falls back to defaults on any missing or
 * malformed value — never trust the stored shape.
 */

import { DEFAULT_PAYER_CRITERIA, type PayerCriteria } from '@/services/financial-analytics.service'

export const PAYER_CRITERIA_KEY = 'payer_criteria'

function asFiniteNumber(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function mergePayerCriteria(raw: unknown): PayerCriteria {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PAYER_CRITERIA }
  const r = raw as Record<string, unknown>
  return {
    good_grace_days: asFiniteNumber(r.good_grace_days) ?? DEFAULT_PAYER_CRITERIA.good_grace_days,
    bad_months_overdue:
      asFiniteNumber(r.bad_months_overdue) ?? DEFAULT_PAYER_CRITERIA.bad_months_overdue,
    bad_debt_ratio: asFiniteNumber(r.bad_debt_ratio) ?? DEFAULT_PAYER_CRITERIA.bad_debt_ratio,
  }
}

/** Read stored criteria via any Supabase client; defaults on any failure. */
export async function readPayerCriteria(client: any): Promise<PayerCriteria> {
  const { data } = await client
    .from('app_settings')
    .select('value')
    .eq('key', PAYER_CRITERIA_KEY)
    .maybeSingle()
  if (!data?.value) return { ...DEFAULT_PAYER_CRITERIA }
  try {
    return mergePayerCriteria(JSON.parse(data.value))
  } catch {
    return { ...DEFAULT_PAYER_CRITERIA }
  }
}
