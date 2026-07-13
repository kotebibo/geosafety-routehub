export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/middleware/auth'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { OVERDUE_VISIT_DAYS } from '@/features/boards/constants/checkin'

/**
 * GET /api/checkins/visits-due
 *
 * The inspector's visit schedule, derived from checkin recency: every item
 * on the caller's boards that has a checkin column, with days since the
 * last visit and an urgency bucket. Replaces the legacy routes system —
 * "what needs visiting" falls out of the audit trail instead of being
 * planned separately.
 *
 * Buckets: overdue (> OVERDUE_VISIT_DAYS), due_soon (last week of the
 * window), ok, never_visited.
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = createServerClient()
    await requireAuth()

    // RLS scopes this to boards the caller can access
    const { data: boards, error: boardsError } = await supabase.from('boards').select('id, name')
    if (boardsError) throw boardsError
    if (!boards || boards.length === 0) return NextResponse.json([])

    const boardIds = boards.map(b => b.id)
    const boardNames = new Map(boards.map(b => [b.id, b.name]))

    const service = createServiceClient()

    // Only boards that actually track visits
    const { data: checkinCols, error: colsError } = await service
      .from('board_columns')
      .select('board_id')
      .eq('column_type', 'checkin')
      .in('board_id', boardIds)
    if (colsError) throw colsError

    const visitBoardIds = [
      ...new Set((checkinCols || []).map(c => c.board_id).filter((id): id is string => !!id)),
    ]
    if (visitBoardIds.length === 0) return NextResponse.json([])

    // Items + latest visit per item in one round-trip each
    const [{ data: items, error: itemsError }, { data: latest, error: latestError }] =
      await Promise.all([
        service
          .from('board_items')
          .select('id, name, board_id')
          .in('board_id', visitBoardIds)
          .is('deleted_at', null),
        service
          .from('location_checkins')
          // board_item_id postdates the generated database types
          .select('board_item_id, created_at' as '*')
          .not('board_item_id', 'is', null)
          .order('created_at', { ascending: false }),
      ])
    if (itemsError) throw itemsError
    if (latestError) throw latestError

    const lastVisitByItem = new Map<string, string>()
    for (const c of (latest || []) as unknown as Array<{
      board_item_id: string
      created_at: string
    }>) {
      if (c.board_item_id && !lastVisitByItem.has(c.board_item_id)) {
        lastVisitByItem.set(c.board_item_id, c.created_at)
      }
    }

    const now = Date.now()
    const dueSoonFloor = OVERDUE_VISIT_DAYS - 7

    const result = (items || []).map(item => {
      const lastVisit = lastVisitByItem.get(item.id) ?? null
      const daysSince = lastVisit
        ? Math.floor((now - new Date(lastVisit).getTime()) / 86400000)
        : null
      const status =
        daysSince === null
          ? 'never_visited'
          : daysSince > OVERDUE_VISIT_DAYS
            ? 'overdue'
            : daysSince > dueSoonFloor
              ? 'due_soon'
              : 'ok'
      return {
        item_id: item.id,
        item_name: item.name,
        board_id: item.board_id,
        board_name: boardNames.get(item.board_id) ?? '',
        last_visit_at: lastVisit,
        days_since_visit: daysSince,
        status,
      }
    })

    // Most urgent first: overdue by staleness, then due_soon, then never
    // visited, then recently visited
    const rank: Record<string, number> = { overdue: 0, due_soon: 1, never_visited: 2, ok: 3 }
    result.sort(
      (a, b) =>
        rank[a.status] - rank[b.status] ||
        (b.days_since_visit ?? -1) - (a.days_since_visit ?? -1) ||
        a.item_name.localeCompare(b.item_name)
    )

    return NextResponse.json(result)
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    console.error('Visits-due error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
