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
      result = result.filter(
        item =>
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
          const rawValue = filter.column === 'name' ? item.name : item.data?.[filter.column]

          // Normalize complex types for comparison
          // Company columns store {company_id, location_id} — extract company_id
          const isCompanyObject =
            rawValue &&
            typeof rawValue === 'object' &&
            !Array.isArray(rawValue) &&
            'company_id' in rawValue
          // Date range columns store {start, end} — extract for date comparison
          const isDateRange =
            rawValue &&
            typeof rawValue === 'object' &&
            !Array.isArray(rawValue) &&
            ('start' in rawValue || 'end' in rawValue)

          const value = isCompanyObject ? rawValue.company_id : rawValue
          const isArrayValue = Array.isArray(value)

          switch (filter.condition) {
            case 'equals':
              if (isArrayValue) {
                return (value as string[]).includes(filter.value)
              }
              return String(value || '').toLowerCase() === String(filter.value || '').toLowerCase()
            case 'not_equals':
              if (isArrayValue) {
                return !(value as string[]).includes(filter.value)
              }
              return String(value || '').toLowerCase() !== String(filter.value || '').toLowerCase()
            case 'contains':
              if (isArrayValue) {
                return (value as string[]).some(v =>
                  String(v)
                    .toLowerCase()
                    .includes(String(filter.value || '').toLowerCase())
                )
              }
              return String(value || '')
                .toLowerCase()
                .includes(String(filter.value || '').toLowerCase())
            case 'starts_with':
              return String(value || '')
                .toLowerCase()
                .startsWith(String(filter.value || '').toLowerCase())
            case 'ends_with':
              return String(value || '')
                .toLowerCase()
                .endsWith(String(filter.value || '').toLowerCase())
            case 'greater_than':
              return Number(value) > Number(filter.value)
            case 'less_than':
              return Number(value) < Number(filter.value)
            case 'before':
              if (isDateRange) {
                const endDate = rawValue.end || rawValue.start
                return endDate ? new Date(endDate) < new Date(filter.value) : false
              }
              return new Date(value) < new Date(filter.value)
            case 'after':
              if (isDateRange) {
                const startDate = rawValue.start || rawValue.end
                return startDate ? new Date(startDate) > new Date(filter.value) : false
              }
              return new Date(value) > new Date(filter.value)
            case 'is_empty':
              if (isArrayValue) return (value as string[]).length === 0
              if (isCompanyObject) return !rawValue.company_id
              if (isDateRange) return !rawValue.start && !rawValue.end
              return value === null || value === undefined || value === ''
            case 'is_not_empty':
              if (isArrayValue) return (value as string[]).length > 0
              if (isCompanyObject) return !!rawValue.company_id
              if (isDateRange) return !!rawValue.start || !!rawValue.end
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
        const aRaw = sortConfig.column === 'name' ? a.name : a.data?.[sortConfig.column]
        const bRaw = sortConfig.column === 'name' ? b.name : b.data?.[sortConfig.column]

        // Normalize null/undefined/empty to null for consistent comparison
        const aVal = aRaw == null || aRaw === '' ? null : aRaw
        const bVal = bRaw == null || bRaw === '' ? null : bRaw

        // Try numeric comparison — treat null as 0
        const aNum = aVal == null ? 0 : typeof aVal === 'number' ? aVal : Number(aVal)
        const bNum = bVal == null ? 0 : typeof bVal === 'number' ? bVal : Number(bVal)
        let comparison = 0
        if (
          !isNaN(aNum) &&
          !isNaN(bNum) &&
          typeof aVal !== 'boolean' &&
          typeof bVal !== 'boolean'
        ) {
          comparison = aNum - bNum
        } else if (
          typeof aVal === 'string' &&
          typeof bVal === 'string' &&
          (aVal.match(/^\d{4}-\d{2}/) || bVal.match(/^\d{4}-\d{2}/))
        ) {
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
