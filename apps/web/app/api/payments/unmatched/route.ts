/**
 * Unmatched Payments API
 * Returns unmatched transactions with suggested company matches
 * Protected: Admin or Dispatcher
 */

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdminOrDispatcher } from '@/middleware/auth'

export async function GET() {
  try {
    await requireAdminOrDispatcher()
    const supabase = createServerClient() as any

    // Get unmatched transactions
    const { data: unmatched, error: unmatchedError } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('status', 'unmatched')
      .order('entry_date', { ascending: false })
      .limit(100)

    if (unmatchedError) throw unmatchedError

    // For each unmatched transaction, find suggested matches
    const results = await Promise.all(
      (unmatched || []).map(async (txn: any) => {
        const suggestions: Array<{
          company_id: string
          company_name: string
          tax_id: string | null
          confidence: number
          reason: string
        }> = []

        // Suggest by tax ID partial match
        if (txn.sender_inn) {
          const { data: innMatches } = await supabase
            .from('companies')
            .select('id, name, tax_id')
            .eq('tax_id', txn.sender_inn)
            .limit(3)

          if (innMatches) {
            for (const c of innMatches) {
              suggestions.push({
                company_id: c.id,
                company_name: c.name,
                tax_id: c.tax_id,
                confidence: 1.0,
                reason: 'Tax ID exact match',
              })
            }
          }
        }

        // Suggest by name similarity (if no INN match found)
        if (suggestions.length === 0 && txn.sender_name) {
          const { data: nameMatches } = await supabase
            .from('companies')
            .select('id, name, tax_id')
            .limit(5)

          // Client-side similarity check (rough, since Supabase JS doesn't support pg_trgm directly)
          if (nameMatches) {
            const senderLower = txn.sender_name.toLowerCase()
            const scored = nameMatches
              .map((c: any) => ({
                ...c,
                score: basicSimilarity(c.name.toLowerCase(), senderLower),
              }))
              .filter((c: any) => c.score > 0.2)
              .sort((a: any, b: any) => b.score - a.score)
              .slice(0, 3)

            for (const c of scored) {
              suggestions.push({
                company_id: c.id,
                company_name: c.name,
                tax_id: c.tax_id,
                confidence: c.score,
                reason: 'Name similarity',
              })
            }
          }
        }

        return {
          ...txn,
          suggested_companies: suggestions,
        }
      })
    )

    return NextResponse.json(results)
  } catch (error: any) {
    console.error('Error fetching unmatched payments:', error)

    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Basic string similarity (Jaccard index on character bigrams)
 * Used as a rough client-side fallback
 */
function basicSimilarity(a: string, b: string): number {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0

  const bigramsA = new Set<string>()
  const bigramsB = new Set<string>()

  for (let i = 0; i < a.length - 1; i++) bigramsA.add(a.slice(i, i + 2))
  for (let i = 0; i < b.length - 1; i++) bigramsB.add(b.slice(i, i + 2))

  let intersection = 0
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++
  }

  return intersection / (bigramsA.size + bigramsB.size - intersection)
}
