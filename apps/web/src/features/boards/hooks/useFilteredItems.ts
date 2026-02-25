import { useMemo } from 'react'
import type { BoardItem } from '../types/board'
import type { SortConfig, FilterConfig } from '../components/BoardToolbar'

export function useFilteredItems(
  items: BoardItem[] | undefined,
  searchQuery: string,
  filters: FilterConfig[],
  sortConfig: SortConfig | null
) {
  return useMemo(() => {
    let result = items || []

    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      result = result.filter(item =>
        item.name?.toLowerCase().includes(searchLower) ||
        Object.values(item.data || {}).some(val =>
          String(val).toLowerCase().includes(searchLower)
        )
      )
    }

    // Apply column filters
    if (filters.length > 0) {
      result = result.filter(item => {
        return filters.every(filter => {
          const value = filter.column === 'name'
            ? item.name
            : item.data?.[filter.column]

          switch (filter.condition) {
            case 'equals':
              return String(value || '').toLowerCase() === String(filter.value || '').toLowerCase()
            case 'not_equals':
              return String(value || '').toLowerCase() !== String(filter.value || '').toLowerCase()
            case 'contains':
              return String(value || '').toLowerCase().includes(String(filter.value || '').toLowerCase())
            case 'starts_with':
              return String(value || '').toLowerCase().startsWith(String(filter.value || '').toLowerCase())
            case 'ends_with':
              return String(value || '').toLowerCase().endsWith(String(filter.value || '').toLowerCase())
            case 'greater_than':
              return Number(value) > Number(filter.value)
            case 'less_than':
              return Number(value) < Number(filter.value)
            case 'before':
              return new Date(value) < new Date(filter.value)
            case 'after':
              return new Date(value) > new Date(filter.value)
            case 'is_empty':
              return value === null || value === undefined || value === ''
            case 'is_not_empty':
              return value !== null && value !== undefined && value !== ''
            case 'is_checked':
              return value === true
            case 'is_not_checked':
              return value !== true
            default:
              return true
          }
        })
      })
    }

    // Apply sorting
    if (sortConfig) {
      result = [...result].sort((a, b) => {
        const aRaw = sortConfig.column === 'name'
          ? a.name
          : a.data?.[sortConfig.column]
        const bRaw = sortConfig.column === 'name'
          ? b.name
          : b.data?.[sortConfig.column]

        // Normalize null/undefined/empty to null for consistent comparison
        const aVal = (aRaw == null || aRaw === '') ? null : aRaw
        const bVal = (bRaw == null || bRaw === '') ? null : bRaw

        // Try numeric comparison — treat null as 0
        const aNum = aVal == null ? 0 : (typeof aVal === 'number' ? aVal : Number(aVal))
        const bNum = bVal == null ? 0 : (typeof bVal === 'number' ? bVal : Number(bVal))
        let comparison = 0
        if (!isNaN(aNum) && !isNaN(bNum) && typeof aVal !== 'boolean' && typeof bVal !== 'boolean') {
          comparison = aNum - bNum
        } else if (typeof aVal === 'string' && typeof bVal === 'string' && (aVal.match(/^\d{4}-\d{2}/) || bVal.match(/^\d{4}-\d{2}/))) {
          // Date string comparison
          comparison = new Date(aVal).getTime() - new Date(bVal).getTime()
        } else {
          comparison = String(aVal ?? '').localeCompare(String(bVal ?? ''))
        }

        return sortConfig.direction === 'asc' ? comparison : -comparison
      })
    }

    return result
  }, [items, searchQuery, filters, sortConfig])
}
