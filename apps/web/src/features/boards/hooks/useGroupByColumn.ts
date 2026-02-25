import { useMemo } from 'react'
import type { BoardItem, BoardGroup, BoardColumn } from '../types/board'

// Color palette for dynamically created groups
const GROUP_COLORS = [
  '#579bfc', '#00c875', '#fdab3d', '#e2445c', '#a25ddc',
  '#0086c0', '#9cd326', '#ff642e', '#ff007f', '#bb3354',
  '#175a63', '#037f4c', '#66ccff', '#784bd1', '#ff158a',
]

interface GroupByResult {
  groups: BoardGroup[]
  items: BoardItem[]
}

/**
 * When groupByColumn is set, dynamically re-groups items by unique values
 * in that column and returns virtual groups + items with remapped group_id.
 * When groupByColumn is null, returns original groups + items unchanged.
 */
export function useGroupByColumn(
  groupByColumn: string | null,
  originalGroups: BoardGroup[],
  originalItems: BoardItem[] | undefined,
  columns: BoardColumn[] | undefined,
): GroupByResult {
  return useMemo(() => {
    const items = originalItems || []

    // No dynamic grouping — use DB groups as-is
    if (!groupByColumn) {
      return { groups: originalGroups, items }
    }

    // Find the column definition for label lookups (status columns)
    const colDef = columns?.find(c => c.column_id === groupByColumn)

    // Resolve status options for label lookup
    const statusOptions = colDef?.column_type === 'status' && colDef.config?.options
      ? (Array.isArray(colDef.config.options)
          ? colDef.config.options as Array<{ key: string; label: string }>
          : Object.entries(colDef.config.options).map(([key, opt]: [string, any]) => ({ key, label: opt.label })))
      : null
    const defaultStatusLabel = statusOptions?.[0]?.label

    // Helper to resolve a raw cell value to a display string for grouping
    const resolveDisplayValue = (rawValue: any): string => {
      if (colDef?.column_type === 'status') {
        // For status columns, null/empty means the default (first) status
        if (rawValue == null || rawValue === '' || rawValue === 'default') {
          return defaultStatusLabel || '(Empty)'
        }
        const opt = statusOptions?.find(o => o.key === rawValue)
        return opt?.label || String(rawValue)
      }
      if (rawValue == null || rawValue === '') {
        return '(Empty)'
      }
      if (colDef?.column_type === 'checkbox') {
        return rawValue === true || rawValue === 'true' ? 'Checked' : 'Unchecked'
      }
      return String(rawValue)
    }

    // Collect unique values and build groups
    const valueToGroupId = new Map<string, string>()
    const groupList: BoardGroup[] = []
    let position = 0

    for (const item of items) {
      const rawValue = groupByColumn === 'name'
        ? item.name
        : item.data?.[groupByColumn]

      const displayValue = resolveDisplayValue(rawValue)

      if (!valueToGroupId.has(displayValue)) {
        const groupId = `groupby_${position}`
        valueToGroupId.set(displayValue, groupId)
        groupList.push({
          id: groupId,
          board_id: items[0]?.board_id || '',
          name: displayValue,
          color: GROUP_COLORS[position % GROUP_COLORS.length],
          position,
        })
        position++
      }
    }

    // Remap items' group_id to virtual group ids
    const remappedItems = items.map(item => {
      const rawValue = groupByColumn === 'name'
        ? item.name
        : item.data?.[groupByColumn]

      const displayValue = resolveDisplayValue(rawValue)
      const virtualGroupId = valueToGroupId.get(displayValue)!
      return { ...item, group_id: virtualGroupId }
    })

    return { groups: groupList, items: remappedItems }
  }, [groupByColumn, originalGroups, originalItems, columns])
}
