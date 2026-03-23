'use client'

import React, { useState, useRef, useEffect, useCallback, memo } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { ArrowUpDown, Layers, Filter, ChevronDown, X, ArrowUp, ArrowDown } from 'lucide-react'
import type { BoardColumn, ColumnType } from '../types/board'
import { MONDAY_COLORS, DEFAULT_STATUS_OPTIONS } from './BoardTable/cells/StatusCell'
import type { StatusOption } from './BoardTable/cells/StatusCell'
import { FilterPopover } from './FilterPopover'

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
  const [showFilterPopover, setShowFilterPopover] = useState(false)

  const sortButtonRef = useRef<HTMLButtonElement>(null)
  const groupButtonRef = useRef<HTMLButtonElement>(null)
  const filterButtonRef = useRef<HTMLButtonElement>(null)

  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const [filterPosition, setFilterPosition] = useState({ top: 0, left: 0 })
  const [editFilterId, setEditFilterId] = useState<string | null>(null)

  // Temporary state for sort dropdown
  const [tempSortColumn, setTempSortColumn] = useState<string>(sortConfig?.column || '')
  const [tempSortDirection, setTempSortDirection] = useState<'asc' | 'desc'>(
    sortConfig?.direction || 'asc'
  )

  // Update temp state when sortConfig changes externally
  useEffect(() => {
    setTempSortColumn(sortConfig?.column || '')
    setTempSortDirection(sortConfig?.direction || 'asc')
  }, [sortConfig])

  // Keyboard shortcut: F to open filters
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input/textarea/select
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return
      }
      if (e.key === 'f' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        if (filterButtonRef.current) {
          const rect = filterButtonRef.current.getBoundingClientRect()
          setFilterPosition({ top: rect.bottom + 4, left: rect.left })
        }
        setShowSortDropdown(false)
        setShowGroupDropdown(false)
        setShowFilterPopover(prev => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

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
    setShowFilterPopover(false)
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

  const handleRemoveFilter = useCallback(
    (filterId: string) => {
      onFiltersChange(filters.filter(f => f.id !== filterId))
    },
    [filters, onFiltersChange]
  )

  // Groupable columns - memoized
  const groupableColumns = React.useMemo(
    () => columns.filter(col => !NON_GROUPABLE_TYPES.includes(col.column_type)),
    [columns]
  )

  // Get display info for filter chips
  const getChipDisplay = useCallback(
    (filter: FilterConfig) => {
      const col = columns.find(c => c.column_id === filter.column)
      if (!col)
        return {
          name: filter.column,
          condition: filter.condition.replace(/_/g, ' '),
          value: filter.value,
          statusColor: null,
        }

      const condLabel = filter.condition.replace(/_/g, ' ')
      let displayValue = filter.value
      let statusColor: string | null = null

      if (col.column_type === 'status' && filter.value) {
        const opts = col.config?.options as StatusOption[] | undefined
        const allOpts = opts && opts.length > 0 ? opts : DEFAULT_STATUS_OPTIONS
        const match = allOpts.find(o => o.key === filter.value)
        if (match) {
          displayValue = match.label
          statusColor = MONDAY_COLORS[match.color]?.hex || '#C4C4C4'
        }
      }

      return { name: col.column_name, condition: condLabel, value: displayValue, statusColor }
    },
    [columns]
  )

  return (
    <div className="flex items-center gap-2 flex-wrap">
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
          if (showFilterPopover) {
            closeAllDropdowns()
          } else {
            setShowSortDropdown(false)
            setShowGroupDropdown(false)
            setEditFilterId(null)
            if (filterButtonRef.current) {
              const rect = filterButtonRef.current.getBoundingClientRect()
              setFilterPosition({ top: rect.bottom + 4, left: rect.left })
            }
            setShowFilterPopover(true)
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
        <span>{filters.length > 0 ? `Filtered` : 'Filter'}</span>
        {filters.length > 0 && (
          <span className="text-xs bg-monday-primary text-white px-1.5 py-0.5 rounded">
            {filters.length}
          </span>
        )}
        <ChevronDown className="w-3 h-3" />
      </button>

      {/* Filter Chips - inline in toolbar */}
      {filters.length > 0 && (
        <div className="flex items-center gap-1.5 ml-1">
          {filters.map((filter, index) => {
            const { name, condition, value, statusColor } = getChipDisplay(filter)
            return (
              <React.Fragment key={filter.id}>
                {index > 0 && <span className="text-xs text-text-tertiary">and</span>}
                <div
                  onClick={() => {
                    setEditFilterId(filter.id)
                    if (filterButtonRef.current) {
                      const rect = filterButtonRef.current.getBoundingClientRect()
                      setFilterPosition({ top: rect.bottom + 4, left: rect.left })
                    }
                    setShowSortDropdown(false)
                    setShowGroupDropdown(false)
                    setShowFilterPopover(true)
                  }}
                  className="flex items-center gap-1 px-2 py-1 bg-bg-secondary border border-border-light rounded-md text-xs group hover:border-monday-primary/30 transition-colors cursor-pointer"
                >
                  {statusColor && (
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: statusColor }}
                    />
                  )}
                  <span className="font-medium text-text-primary">{name}</span>
                  <span className="text-text-tertiary">{condition}</span>
                  {value && <span className="text-text-primary">{value}</span>}
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      handleRemoveFilter(filter.id)
                    }}
                    className="ml-0.5 p-0.5 rounded opacity-60 hover:opacity-100 hover:bg-red-100 transition-all"
                  >
                    <X className="w-3 h-3 text-text-tertiary hover:text-red-500" />
                  </button>
                </div>
              </React.Fragment>
            )
          })}
          <button
            onClick={() => {
              onFiltersChange([])
            }}
            className="text-xs text-text-tertiary hover:text-red-500 ml-1 transition-colors"
          >
            Clear all
          </button>
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

      {/* Filter Popover */}
      <FilterPopover
        isOpen={showFilterPopover}
        onClose={() => {
          setShowFilterPopover(false)
          setEditFilterId(null)
        }}
        anchorPosition={filterPosition}
        columns={columns}
        filters={filters}
        onFiltersChange={onFiltersChange}
        initialEditFilterId={editFilterId}
      />
    </div>
  )
})
