/**
 * Flatten grouped board data into a single array for virtualization
 * Each row has a type (group-header, item, group-footer) for rendering
 */

import type { BoardItem, BoardGroup, BoardSubitem } from '../types/board'

export interface VirtualRow {
  id: string
  type:
    | 'group-header'
    | 'column-header'
    | 'item'
    | 'group-summary'
    | 'group-footer'
    | 'group-gap'
    | 'subitem-header'
    | 'subitem'
  data: BoardGroup | BoardItem | BoardSubitem
  groupId: string
  /** For subitem/subitem-header rows, the parent item ID */
  parentItemId?: string
  height: number
}

interface FlattenOptions {
  groups: BoardGroup[]
  items: BoardItem[]
  collapsedGroups: Set<string>
  rowHeight?: number
  headerHeight?: number
  columnHeaderHeight?: number
  footerHeight?: number
  summaryHeight?: number
  /** When true, preserve the order of items as-is (e.g. when a sort is active) */
  preserveItemOrder?: boolean
  /** When true, don't emit column-header rows (use with sticky header) */
  skipColumnHeaders?: boolean
  /** Set of expanded item IDs that show their subitems */
  expandedItems?: Set<string>
  /** Map of parent item ID -> subitems */
  subitemsByParent?: Map<string, BoardSubitem[]>
}

/**
 * Flattens groups and items into a single virtualizable array
 * Group headers and footers are treated as special rows
 */
export function flattenGroupsForVirtualization({
  groups,
  items,
  collapsedGroups,
  rowHeight = 36,
  headerHeight = 48,
  columnHeaderHeight = 36,
  footerHeight = 36,
  summaryHeight = 28,
  preserveItemOrder = false,
  skipColumnHeaders = false,
  expandedItems,
  subitemsByParent,
}: FlattenOptions): VirtualRow[] {
  const rows: VirtualRow[] = []

  // Sort groups by position
  const sortedGroups = [...groups].sort((a, b) => a.position - b.position)

  // Create a map of items by group_id for efficient lookup
  // Check both item.group_id (column) and item.data.group_id (JSONB)
  // If an item has no group_id, assign it to the first group
  const firstGroupId = sortedGroups[0]?.id || 'default'
  const itemsByGroup = new Map<string, BoardItem[]>()

  for (const item of items) {
    // Prioritize the column group_id (may be remapped by useGroupByColumn)
    // over the JSONB data.group_id (which can be stale)
    let groupId = item.group_id ?? (item.data as any)?.group_id

    // If no group_id, assign to first group (not "default" which doesn't exist)
    if (!groupId || groupId === 'default') {
      groupId = firstGroupId
    }

    if (!itemsByGroup.has(groupId)) {
      itemsByGroup.set(groupId, [])
    }
    itemsByGroup.get(groupId)!.push(item)
  }

  for (const group of sortedGroups) {
    // Group header row (group name, color, collapse toggle)
    rows.push({
      id: `header-${group.id}`,
      type: 'group-header',
      data: group,
      groupId: group.id,
      height: headerHeight,
    })

    // Only add column headers and items if group is NOT collapsed
    if (!collapsedGroups.has(group.id)) {
      // Column header row (column names) - comes after group header
      if (!skipColumnHeaders) {
        rows.push({
          id: `colheader-${group.id}`,
          type: 'column-header',
          data: group,
          groupId: group.id,
          height: columnHeaderHeight,
        })
      }

      const groupItems = itemsByGroup.get(group.id) || []
      // Sort items by position within group, unless external sort is active
      const orderedItems = preserveItemOrder
        ? groupItems
        : [...groupItems].sort((a, b) => a.position - b.position)

      for (const item of orderedItems) {
        rows.push({
          id: item.id,
          type: 'item',
          data: item,
          groupId: group.id,
          height: rowHeight,
        })

        // If this item is expanded, inject subitem header + subitem rows
        if (expandedItems?.has(item.id)) {
          const subitems = subitemsByParent?.get(item.id) || []

          // Subitem header (add subitem button row)
          rows.push({
            id: `subitem-header-${item.id}`,
            type: 'subitem-header',
            data: item,
            groupId: group.id,
            parentItemId: item.id,
            height: 32,
          })

          // Individual subitem rows
          for (const subitem of subitems) {
            rows.push({
              id: `subitem-${subitem.id}`,
              type: 'subitem',
              data: subitem,
              groupId: group.id,
              parentItemId: item.id,
              height: 32,
            })
          }
        }
      }

      // Group summary row (aggregates) - only if group has items
      if (orderedItems.length > 0) {
        rows.push({
          id: `summary-${group.id}`,
          type: 'group-summary',
          data: group,
          groupId: group.id,
          height: summaryHeight,
        })
      }

      // Group footer row (add item button)
      rows.push({
        id: `footer-${group.id}`,
        type: 'group-footer',
        data: group,
        groupId: group.id,
        height: footerHeight,
      })
    }

    // Add gap between groups (not after the last group)
    if (group !== sortedGroups[sortedGroups.length - 1]) {
      rows.push({
        id: `gap-${group.id}`,
        type: 'group-gap',
        data: group,
        groupId: group.id,
        height: 60,
      })
    }
  }

  return rows
}

/**
 * Get the total height of all rows (for scroll container sizing)
 */
export function getTotalHeight(rows: VirtualRow[]): number {
  return rows.reduce((sum, row) => sum + row.height, 0)
}

/**
 * Find visible row range based on scroll position
 */
export function getVisibleRange(
  rows: VirtualRow[],
  scrollTop: number,
  viewportHeight: number,
  overscan: number = 10
): { start: number; end: number; topOffset: number } {
  let accumulatedHeight = 0
  let start = 0
  let end = rows.length
  let topOffset = 0

  // Find start index
  for (let i = 0; i < rows.length; i++) {
    if (accumulatedHeight + rows[i].height > scrollTop) {
      start = Math.max(0, i - overscan)
      break
    }
    accumulatedHeight += rows[i].height
  }

  // Calculate top offset for the first visible row
  topOffset = rows.slice(0, start).reduce((sum, r) => sum + r.height, 0)

  // Find end index
  const viewportBottom = scrollTop + viewportHeight
  for (let i = start; i < rows.length; i++) {
    accumulatedHeight += rows[i].height
    if (accumulatedHeight > viewportBottom) {
      end = Math.min(rows.length, i + 1 + overscan)
      break
    }
  }

  return { start, end, topOffset }
}
