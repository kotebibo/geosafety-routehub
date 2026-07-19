'use client'

import { useMemo } from 'react'
import { useBoardItems, useBoardGroups } from '@/features/boards/hooks'
import { useBoardCheckinSummary } from '@/features/boards/hooks/useCheckinQueries'
import { OVERDUE_VISIT_DAYS } from '@/features/boards/constants/checkin'
import type { BoardItem, BoardGroup } from '@/types/board'
import type { CheckinSummary } from '@/types/checkin'

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
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

function toRoutingItem(
  item: BoardItem,
  group: BoardGroup | null,
  summary: CheckinSummary | null
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

/** Flat, urgency-sorted list of a board's companies. Mount only when needed — fetches on mount. */
export function useRoutingItems(boardId: string) {
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
          summaryMap?.get(item.id) ?? null
        )
      )
      .sort(compareByUrgency)
  }, [items, groups, summaryMap])

  return {
    items: routingItems,
    overdueCount: routingItems.filter(ri => ri.isOverdue).length,
    isLoading: itemsLoading || groupsLoading || summaryLoading,
  }
}
