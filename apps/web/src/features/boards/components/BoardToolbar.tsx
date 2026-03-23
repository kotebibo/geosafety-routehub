'use client'

import React, { useState, useRef, useEffect, useCallback, memo } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import {
  ArrowUpDown,
  Layers,
  Filter,
  ChevronDown,
  X,
  ArrowUp,
  ArrowDown,
  Plus,
  Check,
  Calendar,
  Hash,
} from 'lucide-react'
import type { BoardColumn, ColumnType } from '../types/board'
import { MONDAY_COLORS, DEFAULT_STATUS_OPTIONS } from './BoardTable/cells/StatusCell'
import type { StatusOption } from './BoardTable/cells/StatusCell'

// Filter condition types based on column type
const CONDITIONS_BY_TYPE: Record<ColumnType, { value: string; label: string }[]> = {
  text: [
    { value: 'equals', label: 'equals' },
    { value: 'contains', label: 'contains' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'ends_with', label: 'ends with' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  number: [
    { value: 'equals', label: 'equals' },
    { value: 'greater_than', label: 'greater than' },
    { value: 'less_than', label: 'less than' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  date: [
    { value: 'equals', label: 'equals' },
    { value: 'before', label: 'before' },
    { value: 'after', label: 'after' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  date_range: [
    { value: 'before', label: 'ends before' },
    { value: 'after', label: 'starts after' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  status: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'does not equal' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  person: [
    { value: 'equals', label: 'equals' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  checkbox: [
    { value: 'is_checked', label: 'is checked' },
    { value: 'is_not_checked', label: 'is not checked' },
  ],
  location: [
    { value: 'contains', label: 'contains' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  phone: [
    { value: 'contains', label: 'contains' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  route: [
    { value: 'equals', label: 'equals' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  company: [
    { value: 'equals', label: 'equals' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  company_address: [
    { value: 'contains', label: 'contains' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  service_type: [
    { value: 'equals', label: 'equals' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  files: [
    { value: 'is_empty', label: 'has no files' },
    { value: 'is_not_empty', label: 'has files' },
  ],
  updates: [
    { value: 'is_empty', label: 'has no updates' },
    { value: 'is_not_empty', label: 'has updates' },
  ],
  actions: [],
}

// Columns that don't make sense for grouping
const NON_GROUPABLE_TYPES: ColumnType[] = ['files', 'updates', 'actions', 'location', 'phone']

export interface SortConfig {
  column: string
  direction: 'asc' | 'desc'
}

export interface FilterConfig {
  id: string
  column: string
  condition: string
  value: any
}

interface BoardToolbarProps {
  columns: BoardColumn[]
  sortConfig: SortConfig | null
  onSortChange: (config: SortConfig | null) => void
  groupByColumn: string | null
  onGroupByChange: (columnId: string | null) => void
  filters: FilterConfig[]
  onFiltersChange: (filters: FilterConfig[]) => void
}

export const BoardToolbar = memo(function BoardToolbar({
  columns,
  sortConfig,
  onSortChange,
  groupByColumn,
  onGroupByChange,
  filters,
  onFiltersChange,
}: BoardToolbarProps) {
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [showGroupDropdown, setShowGroupDropdown] = useState(false)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)

  const sortButtonRef = useRef<HTMLButtonElement>(null)
  const groupButtonRef = useRef<HTMLButtonElement>(null)
  const filterButtonRef = useRef<HTMLButtonElement>(null)

  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })

  // Temporary state for sort dropdown
  const [tempSortColumn, setTempSortColumn] = useState<string>(sortConfig?.column || '')
  const [tempSortDirection, setTempSortDirection] = useState<'asc' | 'desc'>(
    sortConfig?.direction || 'asc'
  )

  // Temporary state for new filter
  const [newFilterColumn, setNewFilterColumn] = useState<string>('')
  const [newFilterCondition, setNewFilterCondition] = useState<string>('')
  const [newFilterValue, setNewFilterValue] = useState<string>('')

  // Update temp state when sortConfig changes externally
  useEffect(() => {
    setTempSortColumn(sortConfig?.column || '')
    setTempSortDirection(sortConfig?.direction || 'asc')
  }, [sortConfig])

  const openDropdown = useCallback(
    (ref: React.RefObject<HTMLButtonElement>, setter: (val: boolean) => void) => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect()
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
        })
      }
      setter(true)
    },
    []
  )

  const closeAllDropdowns = useCallback(() => {
    setShowSortDropdown(false)
    setShowGroupDropdown(false)
    setShowFilterDropdown(false)
  }, [])

  // Handle sort apply
  const handleApplySort = useCallback(() => {
    if (tempSortColumn) {
      onSortChange({ column: tempSortColumn, direction: tempSortDirection })
    }
    setShowSortDropdown(false)
  }, [tempSortColumn, tempSortDirection, onSortChange])

  const handleClearSort = useCallback(() => {
    onSortChange(null)
    setTempSortColumn('')
    setTempSortDirection('asc')
    setShowSortDropdown(false)
  }, [onSortChange])

  // Handle group by
  const handleGroupBySelect = useCallback(
    (columnId: string | null) => {
      onGroupByChange(columnId)
      setShowGroupDropdown(false)
    },
    [onGroupByChange]
  )

  // Handle add filter
  const handleAddFilter = useCallback(() => {
    if (!newFilterColumn || !newFilterCondition) return

    const needsValue = !['is_empty', 'is_not_empty', 'is_checked', 'is_not_checked'].includes(
      newFilterCondition
    )

    if (needsValue && !newFilterValue) return

    const newFilter: FilterConfig = {
      id: `filter-${Date.now()}`,
      column: newFilterColumn,
      condition: newFilterCondition,
      value: needsValue ? newFilterValue : null,
    }

    onFiltersChange([...filters, newFilter])
    setNewFilterColumn('')
    setNewFilterCondition('')
    setNewFilterValue('')
  }, [newFilterColumn, newFilterCondition, newFilterValue, filters, onFiltersChange])

  const handleRemoveFilter = useCallback(
    (filterId: string) => {
      onFiltersChange(filters.filter(f => f.id !== filterId))
    },
    [filters, onFiltersChange]
  )

  const handleClearAllFilters = useCallback(() => {
    onFiltersChange([])
    setShowFilterDropdown(false)
  }, [onFiltersChange])

  // Get conditions for selected column type
  const getConditionsForColumn = useCallback(
    (columnId: string) => {
      const column = columns.find(c => c.column_id === columnId)
      if (!column) return []
      return CONDITIONS_BY_TYPE[column.column_type] || CONDITIONS_BY_TYPE.text
    },
    [columns]
  )

  // Groupable columns - memoized
  const groupableColumns = React.useMemo(
    () => columns.filter(col => !NON_GROUPABLE_TYPES.includes(col.column_type)),
    [columns]
  )

  // Check if condition needs a value input
  const conditionNeedsValue = useCallback((condition: string) => {
    return !['is_empty', 'is_not_empty', 'is_checked', 'is_not_checked'].includes(condition)
  }, [])

  // Get status options for a column (from config or defaults)
  const getStatusOptions = useCallback(
    (columnId: string): StatusOption[] => {
      const column = columns.find(c => c.column_id === columnId)
      if (!column) return DEFAULT_STATUS_OPTIONS
      const configOptions = column.config?.options as StatusOption[] | undefined
      return configOptions && configOptions.length > 0 ? configOptions : DEFAULT_STATUS_OPTIONS
    },
    [columns]
  )

  // Get column type for a column id
  const getColumnType = useCallback(
    (columnId: string): ColumnType => {
      const column = columns.find(c => c.column_id === columnId)
      return column?.column_type || 'text'
    },
    [columns]
  )

  return (
    <div className="flex items-center gap-2">
      {/* Sort Button */}
      <button
        ref={sortButtonRef}
        onClick={() => {
          if (showSortDropdown) {
            closeAllDropdowns()
          } else {
            closeAllDropdowns()
            openDropdown(sortButtonRef, setShowSortDropdown)
          }
        }}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
          sortConfig
            ? 'bg-monday-primary/10 text-monday-primary'
            : 'bg-bg-secondary text-text-secondary hover:bg-bg-hover hover:text-text-primary'
        )}
      >
        <ArrowUpDown className="w-4 h-4" />
        <span>Sort</span>
        {sortConfig && (
          <span className="text-xs bg-monday-primary text-white px-1.5 py-0.5 rounded">1</span>
        )}
        <ChevronDown className="w-3 h-3" />
      </button>

      {/* Group By Button */}
      <button
        ref={groupButtonRef}
        onClick={() => {
          if (showGroupDropdown) {
            closeAllDropdowns()
          } else {
            closeAllDropdowns()
            openDropdown(groupButtonRef, setShowGroupDropdown)
          }
        }}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
          groupByColumn
            ? 'bg-monday-primary/10 text-monday-primary'
            : 'bg-bg-secondary text-text-secondary hover:bg-bg-hover hover:text-text-primary'
        )}
      >
        <Layers className="w-4 h-4" />
        <span>Group</span>
        {groupByColumn && (
          <span className="text-xs bg-monday-primary text-white px-1.5 py-0.5 rounded">1</span>
        )}
        <ChevronDown className="w-3 h-3" />
      </button>

      {/* Filter Button */}
      <button
        ref={filterButtonRef}
        onClick={() => {
          if (showFilterDropdown) {
            closeAllDropdowns()
          } else {
            closeAllDropdowns()
            openDropdown(filterButtonRef, setShowFilterDropdown)
          }
        }}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
          filters.length > 0
            ? 'bg-monday-primary/10 text-monday-primary'
            : 'bg-bg-secondary text-text-secondary hover:bg-bg-hover hover:text-text-primary'
        )}
      >
        <Filter className="w-4 h-4" />
        <span>Filter</span>
        {filters.length > 0 && (
          <span className="text-xs bg-monday-primary text-white px-1.5 py-0.5 rounded">
            {filters.length}
          </span>
        )}
        <ChevronDown className="w-3 h-3" />
      </button>

      {/* Filter Chips */}
      {filters.length > 0 && (
        <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-border-light">
          {filters.map(filter => {
            const column = columns.find(c => c.column_id === filter.column)
            const filterDisplayValue = (() => {
              if (!filter.value) return null
              if (column?.column_type === 'status') {
                const opts = column.config?.options as StatusOption[] | undefined
                const allOpts = opts && opts.length > 0 ? opts : DEFAULT_STATUS_OPTIONS
                const match = allOpts.find(o => o.key === filter.value)
                return match?.label || filter.value
              }
              return filter.value
            })()
            return (
              <div
                key={filter.id}
                className="flex items-center gap-1 px-2 py-1 bg-monday-primary/10 text-monday-primary rounded text-xs"
              >
                <span className="font-medium">{column?.column_name || filter.column}:</span>
                <span>{filter.condition.replace(/_/g, ' ')}</span>
                {filterDisplayValue && <span>"{filterDisplayValue}"</span>}
                <button
                  onClick={() => handleRemoveFilter(filter.id)}
                  className="ml-1 hover:bg-monday-primary/20 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Sort Dropdown */}
      {showSortDropdown &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={closeAllDropdowns} />
            <div
              className="fixed z-50 bg-white rounded-lg shadow-lg border border-border-light p-4 min-w-[280px]"
              style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
            >
              <div className="text-sm font-semibold text-text-primary mb-3">Sort by</div>

              {/* Column Select */}
              <div className="mb-3">
                <label className="block text-xs text-text-secondary mb-1">Column</label>
                <select
                  value={tempSortColumn}
                  onChange={e => setTempSortColumn(e.target.value)}
                  className="w-full px-3 py-2 border border-border-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-monday-primary"
                >
                  <option value="">Select column...</option>
                  {columns.map(col => (
                    <option key={col.id} value={col.column_id}>
                      {col.column_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Direction Select */}
              <div className="mb-4">
                <label className="block text-xs text-text-secondary mb-1">Direction</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTempSortDirection('asc')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors',
                      tempSortDirection === 'asc'
                        ? 'border-monday-primary bg-monday-primary/10 text-monday-primary'
                        : 'border-border-light hover:bg-bg-hover'
                    )}
                  >
                    <ArrowUp className="w-4 h-4" />
                    Ascending
                  </button>
                  <button
                    onClick={() => setTempSortDirection('desc')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors',
                      tempSortDirection === 'desc'
                        ? 'border-monday-primary bg-monday-primary/10 text-monday-primary'
                        : 'border-border-light hover:bg-bg-hover'
                    )}
                  >
                    <ArrowDown className="w-4 h-4" />
                    Descending
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleClearSort}
                  className="flex-1 px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover rounded-md transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={handleApplySort}
                  disabled={!tempSortColumn}
                  className="flex-1 px-3 py-2 text-sm bg-monday-primary text-white rounded-md hover:bg-monday-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </>,
          document.body
        )}

      {/* Group By Dropdown */}
      {showGroupDropdown &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={closeAllDropdowns} />
            <div
              className="fixed z-50 bg-white rounded-lg shadow-lg border border-border-light py-2 min-w-[200px] max-h-[320px] flex flex-col"
              style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
            >
              <div className="px-3 py-2 text-xs font-semibold text-text-tertiary uppercase shrink-0">
                Group by column
              </div>
              <div className="overflow-y-auto">
                <button
                  onClick={() => handleGroupBySelect(null)}
                  className={cn(
                    'w-full px-3 py-2 text-sm text-left hover:bg-bg-hover transition-colors',
                    !groupByColumn && 'bg-bg-selected text-monday-primary'
                  )}
                >
                  None (use default groups)
                </button>
                <div className="my-1 border-t border-border-light" />
                {groupableColumns.map(col => (
                  <button
                    key={col.id}
                    onClick={() => handleGroupBySelect(col.column_id)}
                    className={cn(
                      'w-full px-3 py-2 text-sm text-left hover:bg-bg-hover transition-colors',
                      groupByColumn === col.column_id && 'bg-bg-selected text-monday-primary'
                    )}
                  >
                    {col.column_name}
                  </button>
                ))}
              </div>
            </div>
          </>,
          document.body
        )}

      {/* Filter Dropdown */}
      {showFilterDropdown &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={closeAllDropdowns} />
            <div
              className="fixed z-50 bg-white rounded-lg shadow-lg border border-border-light p-4 min-w-[340px]"
              style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-text-primary">Filters</div>
                {filters.length > 0 && (
                  <button
                    onClick={handleClearAllFilters}
                    className="text-xs text-text-tertiary hover:text-text-secondary"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Existing Filters */}
              {filters.length > 0 && (
                <div className="mb-3 space-y-2">
                  {filters.map(filter => {
                    const column = columns.find(c => c.column_id === filter.column)
                    const displayVal = (() => {
                      if (!filter.value) return null
                      if (column?.column_type === 'status') {
                        const opts = column.config?.options as StatusOption[] | undefined
                        const allOpts = opts && opts.length > 0 ? opts : DEFAULT_STATUS_OPTIONS
                        const match = allOpts.find(o => o.key === filter.value)
                        return match?.label || filter.value
                      }
                      return filter.value
                    })()
                    return (
                      <div
                        key={filter.id}
                        className="flex items-center justify-between p-2 bg-bg-secondary rounded-md"
                      >
                        <div className="text-sm">
                          <span className="font-medium">{column?.column_name}</span>
                          <span className="text-text-secondary mx-1">
                            {filter.condition.replace(/_/g, ' ')}
                          </span>
                          {displayVal && (
                            <span className="text-monday-primary">"{displayVal}"</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveFilter(filter.id)}
                          className="p-1 hover:bg-bg-hover rounded"
                        >
                          <X className="w-4 h-4 text-text-tertiary" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Add New Filter */}
              <div className="space-y-3">
                <div className="text-xs font-medium text-text-secondary">Add filter</div>

                {/* Column */}
                <select
                  value={newFilterColumn}
                  onChange={e => {
                    setNewFilterColumn(e.target.value)
                    setNewFilterCondition('')
                    setNewFilterValue('')
                  }}
                  className="w-full px-3 py-2 border border-border-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-monday-primary"
                >
                  <option value="">Select column...</option>
                  {columns
                    .filter(c => c.column_type !== 'actions')
                    .map(col => (
                      <option key={col.id} value={col.column_id}>
                        {col.column_name}
                      </option>
                    ))}
                </select>

                {/* Condition */}
                {newFilterColumn && (
                  <select
                    value={newFilterCondition}
                    onChange={e => {
                      setNewFilterCondition(e.target.value)
                      setNewFilterValue('')
                    }}
                    className="w-full px-3 py-2 border border-border-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-monday-primary"
                  >
                    <option value="">Select condition...</option>
                    {getConditionsForColumn(newFilterColumn).map(cond => (
                      <option key={cond.value} value={cond.value}>
                        {cond.label}
                      </option>
                    ))}
                  </select>
                )}

                {/* Value - type-specific input */}
                {newFilterColumn &&
                  newFilterCondition &&
                  conditionNeedsValue(newFilterCondition) &&
                  (() => {
                    const colType = getColumnType(newFilterColumn)

                    // Status → colored option picker
                    if (colType === 'status') {
                      const statusOptions = getStatusOptions(newFilterColumn)
                      return (
                        <div className="max-h-[180px] overflow-y-auto border border-border-light rounded-md">
                          {statusOptions.map(opt => {
                            const colorInfo = MONDAY_COLORS[opt.color] || {
                              hex: '#C4C4C4',
                              text: '#FFFFFF',
                            }
                            const isSelected = newFilterValue === opt.key
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() => setNewFilterValue(opt.key)}
                                className={cn(
                                  'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-bg-hover transition-colors',
                                  isSelected && 'bg-monday-primary/5'
                                )}
                              >
                                <span
                                  className="w-4 h-4 rounded-sm shrink-0"
                                  style={{ backgroundColor: colorInfo.hex }}
                                />
                                <span className="flex-1">{opt.label}</span>
                                {isSelected && (
                                  <Check className="w-4 h-4 text-monday-primary shrink-0" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )
                    }

                    // Number → number input
                    if (colType === 'number') {
                      return (
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                          <input
                            type="number"
                            value={newFilterValue}
                            onChange={e => setNewFilterValue(e.target.value)}
                            placeholder="Enter number..."
                            className="w-full pl-9 pr-3 py-2 border border-border-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-monday-primary"
                          />
                        </div>
                      )
                    }

                    // Date / Date Range → date input
                    if (colType === 'date' || colType === 'date_range') {
                      return (
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                          <input
                            type="date"
                            value={newFilterValue}
                            onChange={e => setNewFilterValue(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-border-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-monday-primary"
                          />
                        </div>
                      )
                    }

                    // Default → text input (for text, person, location, phone, company, etc.)
                    return (
                      <input
                        type="text"
                        value={newFilterValue}
                        onChange={e => setNewFilterValue(e.target.value)}
                        placeholder="Enter value..."
                        className="w-full px-3 py-2 border border-border-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-monday-primary"
                      />
                    )
                  })()}

                {/* Add Button */}
                <button
                  onClick={handleAddFilter}
                  disabled={
                    !newFilterColumn ||
                    !newFilterCondition ||
                    (conditionNeedsValue(newFilterCondition) && !newFilterValue)
                  }
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-monday-primary text-white rounded-md hover:bg-monday-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Filter
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  )
})
