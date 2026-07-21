'use client'

import { useMemo } from 'react'
import { useBoardItems, useBoardGroups } from '@/features/boards/hooks'
import { useBoardCheckinSummary } from '@/features/boards/hooks/useCheckinQueries'
import { OVERDUE_VISIT_DAYS } from '@/features/boards/constants/checkin'
import { useMyRoutes } from './useMyRoutes'
import { mondayOf, dayKey, addDays } from '../lib/week'
import type { BoardItem, BoardGroup, Board } from '@/types/board'
import type { CheckinSummary } from '@/types/checkin'

/** Where this item sits in the current week's saved plan, if at all. */
export interface PlannedDay {
  /** YYYY-MM-DD of the planned visit */
  date: string
  /** Stop order within that day's route */
  position: number
}

export interface RoutingItem {
  item: BoardItem
  group: BoardGroup | null
  summary: CheckinSummary | null
  /** True when the item has no visit history — the clock runs from item creation instead */
  neverVisited: boolean
  /** Full days since the latest visit (or since creation when never visited) */
  daysSinceVisit: number | null
  /** Days remaining until the visit deadline; negative = overdue */
  daysLeft: number | null
  isOverdue: boolean
  hasActiveCheckin: boolean
  /** Set when the item is on this week's saved plan (drives the top tier + day chip) */
  plannedDay: PlannedDay | null
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

function toRoutingItem(
  item: BoardItem,
  group: BoardGroup | null,
  summary: CheckinSummary | null,
  plannedDay: PlannedDay | null
): RoutingItem {
  const latest = summary?.latest_created_at
  // Never-visited items still race the 35-day window — counted from creation
  const baseline = latest ?? item.created_at
  const daysSinceVisit = baseline ? daysSince(baseline) : null
  const daysLeft = daysSinceVisit === null ? null : OVERDUE_VISIT_DAYS - daysSinceVisit

  return {
    item,
    group,
    summary,
    neverVisited: !latest,
    daysSinceVisit,
    daysLeft,
    isOverdue: daysLeft !== null && daysLeft < 0,
    hasActiveCheckin: summary?.has_active ?? false,
    plannedDay,
  }
}

/**
 * Urgency order: places that need a visit first, freshly visited last.
 *   1. deadline order — most overdue first, soonest deadline next
 *      (never-visited items compete on the same scale, counted from creation)
 *   2. items with an active check-in at the very bottom
 */
function urgencySortKey(ri: RoutingItem): number {
  if (ri.hasActiveCheckin) return Number.MAX_SAFE_INTEGER
  if (ri.daysLeft === null) return -0.5 // no dates at all: treat as due now
  return ri.daysLeft
}

function compareByUrgency(a: RoutingItem, b: RoutingItem): number {
  const diff = urgencySortKey(a) - urgencySortKey(b)
  if (diff !== 0) return diff
  return a.item.name.localeCompare(b.item.name, 'ka')
}

// Ordering tiers: (1) this week's planned stops first, in day → position order
// so the week's route reads top-to-bottom; (2) everything else by urgency
// (soonest deadline first). Keeps the planned week pinned above the backlog.
function comparePlannedThenUrgency(a: RoutingItem, b: RoutingItem): number {
  const ap = a.plannedDay
  const bp = b.plannedDay
  if (ap && !bp) return -1
  if (!ap && bp) return 1
  if (ap && bp) {
    if (ap.date !== bp.date) return ap.date.localeCompare(bp.date)
    if (ap.position !== bp.position) return ap.position - bp.position
    return a.item.name.localeCompare(b.item.name, 'ka')
  }
  return compareByUrgency(a, b)
}

/**
 * Flat, sorted list of a board's companies. Mount only when needed — fetches on
 * mount. Pass `plannedByItemId` (item id → this week's plan slot) to pin the
 * week's planned stops to the top in day/position order.
 */
export function useRoutingItems(boardId: string, plannedByItemId?: Map<string, PlannedDay>) {
  const { data: items = [], isLoading: itemsLoading } = useBoardItems(boardId)
  const { data: groups = [], isLoading: groupsLoading } = useBoardGroups(boardId)
  const { data: summaryMap, isLoading: summaryLoading } = useBoardCheckinSummary(boardId)

  const routingItems = useMemo<RoutingItem[]>(() => {
    const groupById = new Map(groups.map(g => [g.id, g]))
    return items
      .map(item =>
        toRoutingItem(
          item,
          (item.group_id && groupById.get(item.group_id)) || null,
          summaryMap?.get(item.id) ?? null,
          plannedByItemId?.get(item.id) ?? null
        )
      )
      .sort(comparePlannedThenUrgency)
  }, [items, groups, summaryMap, plannedByItemId])

  return {
    items: routingItems,
    overdueCount: routingItems.filter(ri => ri.isOverdue).length,
    plannedCount: routingItems.filter(ri => ri.plannedDay).length,
    isLoading: itemsLoading || groupsLoading || summaryLoading,
  }
}

/**
 * This week's saved plan for the board's assigned officer, as item id → slot.
 * Empty when no officer is assigned. Feeds `useRoutingItems` so the week's
 * planned stops pin to the top with their day.
 */
export function useBoardWeekPlan(board: Board): Map<string, PlannedDay> {
  const officerId = board.settings?.assigned_officer_id ?? ''
  const { data } = useMyRoutes(officerId)

  return useMemo(() => {
    const map = new Map<string, PlannedDay>()
    if (!data?.routes) return map
    const weekStart = dayKey(mondayOf(0))
    const weekEnd = addDays(weekStart, 6)
    for (const r of data.routes) {
      if (r.date < weekStart || r.date > weekEnd) continue
      for (const s of r.stops) {
        if (!s.boardItemId) continue
        const existing = map.get(s.boardItemId)
        // Earliest day wins if an item is somehow planned twice in one week
        if (!existing || r.date < existing.date) {
          map.set(s.boardItemId, { date: r.date, position: s.position })
        }
      }
    }
    return map
  }, [data])
}
