'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import {
  Search,
  X,
  ChevronLeft,
  Check,
  Calendar,
  Hash,
  Type,
  User,
  MapPin,
  Phone,
  Mail,
  CheckSquare,
  FileText,
  MessageSquare,
  Building2,
  Route,
  Briefcase,
  Clock,
  CircleDot,
  Plus,
  Pencil,
} from 'lucide-react'
import { useUsers } from '@/hooks/useUsers'
import { useRoutes } from '@/features/routes/hooks/useRoutes'
import { useServiceTypes } from '@/hooks/useServiceTypes'
import { useCompaniesWithLocationCount } from '@/hooks/useCompanyLocations'
import type { BoardColumn, ColumnType } from '../types/board'
import { MONDAY_COLORS, DEFAULT_STATUS_OPTIONS } from './BoardTable/cells/StatusCell'
import type { StatusOption } from './BoardTable/cells/StatusCell'
import type { FilterConfig } from './BoardToolbar'

// Smart default operators per column type
const DEFAULT_OPERATOR: Partial<Record<ColumnType, string>> = {
  text: 'contains',
  status: 'equals',
  person: 'equals',
  number: 'equals',
  date: 'equals',
  date_range: 'after',
  checkbox: 'is_checked',
  location: 'contains',
  phone: 'contains',
  email: 'contains',
  route: 'equals',
  company: 'equals',
  company_address: 'contains',
  service_type: 'equals',
  files: 'is_not_empty',
  updates: 'is_not_empty',
}

// Column type icons
export const COLUMN_TYPE_ICONS: Record<ColumnType, React.ElementType> = {
  text: Type,
  number: Hash,
  date: Calendar,
  date_range: Clock,
  status: CircleDot,
  person: User,
  checkbox: CheckSquare,
  location: MapPin,
  phone: Phone,
  email: Mail,
  route: Route,
  company: Building2,
  company_address: MapPin,
  service_type: Briefcase,
  files: FileText,
  updates: MessageSquare,
  actions: FileText,
}

// Conditions that don't need a value
const NO_VALUE_CONDITIONS = ['is_empty', 'is_not_empty', 'is_checked', 'is_not_checked']

// Filter conditions by type
const CONDITIONS_BY_TYPE: Record<ColumnType, { value: string; label: string }[]> = {
  text: [
    { value: 'contains', label: 'contains' },
    { value: 'equals', label: 'is' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'ends_with', label: 'ends with' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  number: [
    { value: 'equals', label: '=' },
    { value: 'greater_than', label: '>' },
    { value: 'less_than', label: '<' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  date: [
    { value: 'equals', label: 'is' },
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
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'is not' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  person: [
    { value: 'equals', label: 'is' },
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
  email: [
    { value: 'contains', label: 'contains' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  route: [
    { value: 'equals', label: 'is' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  company: [
    { value: 'equals', label: 'is' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  company_address: [
    { value: 'contains', label: 'contains' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  service_type: [
    { value: 'equals', label: 'is' },
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

// Date presets for quick date filtering
const DATE_PRESETS = [
  { label: 'Today', getValue: () => new Date().toISOString().split('T')[0] },
  {
    label: 'Tomorrow',
    getValue: () => {
      const d = new Date()
      d.setDate(d.getDate() + 1)
      return d.toISOString().split('T')[0]
    },
  },
  {
    label: 'Yesterday',
    getValue: () => {
      const d = new Date()
      d.setDate(d.getDate() - 1)
      return d.toISOString().split('T')[0]
    },
  },
  {
    label: 'This week',
    getValue: () => {
      const d = new Date()
      d.setDate(d.getDate() - d.getDay())
      return d.toISOString().split('T')[0]
    },
  },
  {
    label: 'Last 7 days',
    getValue: () => {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      return d.toISOString().split('T')[0]
    },
  },
  {
    label: 'Last 30 days',
    getValue: () => {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      return d.toISOString().split('T')[0]
    },
  },
]

type PopoverStep = 'columns' | 'value'

interface FilterPopoverProps {
  isOpen: boolean
  onClose: () => void
  anchorPosition: { top: number; left: number }
  columns: BoardColumn[]
  filters: FilterConfig[]
  onFiltersChange: (filters: FilterConfig[]) => void
  initialEditFilterId?: string | null
}

export function FilterPopover({
  isOpen,
  onClose,
  anchorPosition,
  columns,
  filters,
  onFiltersChange,
  initialEditFilterId,
}: FilterPopoverProps) {
  const [step, setStep] = useState<PopoverStep>('columns')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedColumn, setSelectedColumn] = useState<BoardColumn | null>(null)
  const [selectedOperator, setSelectedOperator] = useState('')
  const [selectedValue, setSelectedValue] = useState('')
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Reset state when popover opens
  useEffect(() => {
    if (isOpen) {
      // If opening with a specific filter to edit, go straight to edit mode
      if (initialEditFilterId) {
        const filter = filters.find(f => f.id === initialEditFilterId)
        if (filter) {
          const col = columns.find(c => c.column_id === filter.column)
          if (col) {
            setEditingFilterId(filter.id)
            setSelectedColumn(col)
            setSelectedOperator(filter.condition)
            setSelectedValue(filter.value || '')
            setSearchQuery('')
            setStep('value')
            return
          }
        }
      }

      setStep('columns')
      setSearchQuery('')
      setSelectedColumn(null)
      setSelectedOperator('')
      setSelectedValue('')
      setEditingFilterId(null)
      // Focus search on next tick
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [isOpen, initialEditFilterId, filters, columns])

  // Filterable columns (exclude actions and company_address which is derived/read-only)
  const filterableColumns = useMemo(
    () => columns.filter(c => c.column_type !== 'actions' && c.column_type !== 'company_address'),
    [columns]
  )

  // Filtered columns based on search
  const filteredColumns = useMemo(() => {
    if (!searchQuery.trim()) return filterableColumns
    const q = searchQuery.toLowerCase()
    return filterableColumns.filter(col => col.column_name.toLowerCase().includes(q))
  }, [filterableColumns, searchQuery])

  // Data hooks for filter pickers
  const { users } = useUsers()
  const { routes } = useRoutes()
  const { serviceTypes } = useServiceTypes()
  const { data: companies } = useCompaniesWithLocationCount()

  // Get status options for current column
  const statusOptions = useMemo(() => {
    if (!selectedColumn || selectedColumn.column_type !== 'status') return []
    const opts = selectedColumn.config?.options as StatusOption[] | undefined
    return opts && opts.length > 0 ? opts : DEFAULT_STATUS_OPTIONS
  }, [selectedColumn])

  // Get conditions for current column
  const conditions = useMemo(() => {
    if (!selectedColumn) return []
    return CONDITIONS_BY_TYPE[selectedColumn.column_type] || CONDITIONS_BY_TYPE.text
  }, [selectedColumn])

  const handleSelectColumn = useCallback(
    (col: BoardColumn) => {
      setSelectedColumn(col)
      setSearchQuery('')
      const defaultOp = DEFAULT_OPERATOR[col.column_type] || 'contains'
      setSelectedOperator(defaultOp)
      setSelectedValue('')

      // For types that don't need a value (checkbox, files, updates), apply immediately
      if (NO_VALUE_CONDITIONS.includes(defaultOp)) {
        const newFilter: FilterConfig = {
          id: `filter-${Date.now()}`,
          column: col.column_id,
          condition: defaultOp,
          value: null,
        }
        onFiltersChange([...filters, newFilter])
        // Reset to columns view for adding more
        setStep('columns')
        setSelectedColumn(null)
        setSelectedOperator('')
        return
      }

      setStep('value')
    },
    [filters, onFiltersChange]
  )

  const handleApplyFilter = useCallback(
    (value?: string) => {
      if (!selectedColumn || !selectedOperator) return

      const filterValue = value ?? selectedValue
      const needsValue = !NO_VALUE_CONDITIONS.includes(selectedOperator)
      if (needsValue && !filterValue) return

      if (editingFilterId) {
        // Update existing filter
        onFiltersChange(
          filters.map(f =>
            f.id === editingFilterId
              ? { ...f, condition: selectedOperator, value: needsValue ? filterValue : null }
              : f
          )
        )
      } else {
        // Add new filter
        const newFilter: FilterConfig = {
          id: `filter-${Date.now()}`,
          column: selectedColumn.column_id,
          condition: selectedOperator,
          value: needsValue ? filterValue : null,
        }
        onFiltersChange([...filters, newFilter])
      }

      // Reset to columns for adding another filter (popover stays open)
      setStep('columns')
      setSelectedColumn(null)
      setSelectedOperator('')
      setSelectedValue('')
      setEditingFilterId(null)
      setSearchQuery('')
    },
    [selectedColumn, selectedOperator, selectedValue, filters, onFiltersChange, editingFilterId]
  )

  // Edit an existing filter
  const handleEditFilter = useCallback(
    (filter: FilterConfig) => {
      const col = columns.find(c => c.column_id === filter.column)
      if (!col) return

      setEditingFilterId(filter.id)
      setSelectedColumn(col)
      setSelectedOperator(filter.condition)
      setSelectedValue(filter.value || '')
      setSearchQuery('')
      setStep('value')
    },
    [columns]
  )

  const handleRemoveFilter = useCallback(
    (filterId: string) => {
      onFiltersChange(filters.filter(f => f.id !== filterId))
    },
    [filters, onFiltersChange]
  )

  const handleClearAll = useCallback(() => {
    onFiltersChange([])
  }, [onFiltersChange])

  const handleBack = useCallback(() => {
    setStep('columns')
    setSelectedColumn(null)
    setSelectedOperator('')
    setSelectedValue('')
    setEditingFilterId(null)
    setSearchQuery('')
    setTimeout(() => searchInputRef.current?.focus(), 50)
  }, [])

  // Handle keyboard shortcut for applying text/number filters
  const handleValueKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleApplyFilter()
      }
    },
    [handleApplyFilter]
  )

  // Get display label for a filter
  const getFilterDisplayLabel = useCallback(
    (filter: FilterConfig) => {
      const col = columns.find(c => c.column_id === filter.column)
      if (!col) return { name: filter.column, condition: filter.condition, value: filter.value }

      const condDef = (CONDITIONS_BY_TYPE[col.column_type] || []).find(
        c => c.value === filter.condition
      )
      const condLabel = condDef?.label || filter.condition.replace(/_/g, ' ')

      let displayValue = filter.value
      if (col.column_type === 'status' && filter.value) {
        const opts = col.config?.options as StatusOption[] | undefined
        const allOpts = opts && opts.length > 0 ? opts : DEFAULT_STATUS_OPTIONS
        const match = allOpts.find(o => o.key === filter.value)
        if (match) displayValue = match.label
      }
      if (col.column_type === 'person' && filter.value) {
        const person = users?.find(u => u.id === filter.value)
        if (person) displayValue = person.full_name || person.email || filter.value
      }
      if (col.column_type === 'route' && filter.value) {
        const route = routes?.find(r => r.id === filter.value)
        if (route) displayValue = route.name || filter.value
      }
      if (col.column_type === 'company' && filter.value) {
        const company = companies?.find(c => c.id === filter.value)
        if (company) displayValue = company.name || filter.value
      }
      if (col.column_type === 'service_type' && filter.value) {
        const st = serviceTypes?.find(s => s.id === filter.value)
        if (st) displayValue = st.name_ka || st.name || filter.value
      }

      return { name: col.column_name, condition: condLabel, value: displayValue, column: col }
    },
    [columns, users, routes, companies, serviceTypes]
  )

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-bg-primary rounded-lg shadow-lg border border-border-light w-[340px] overflow-hidden"
        style={{ top: anchorPosition.top, left: anchorPosition.left }}
      >
        {/* Active filters section */}
        {filters.length > 0 && step === 'columns' && (
          <div className="border-b border-border-light">
            <div className="flex items-center justify-between px-3 pt-3 pb-1">
              <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
                Active filters
              </span>
              <button
                onClick={handleClearAll}
                className="text-xs text-text-tertiary hover:text-red-500 transition-colors"
              >
                Clear all
              </button>
            </div>
            <div className="px-3 pb-3 space-y-1.5 max-h-[160px] overflow-y-auto">
              {filters.map(filter => {
                const { name, condition, value, column } = getFilterDisplayLabel(filter)
                const statusColor =
                  column?.column_type === 'status' && filter.value
                    ? (() => {
                        const opts = column.config?.options as StatusOption[] | undefined
                        const allOpts = opts && opts.length > 0 ? opts : DEFAULT_STATUS_OPTIONS
                        const match = allOpts.find(o => o.key === filter.value)
                        return match ? MONDAY_COLORS[match.color]?.hex || '#C4C4C4' : null
                      })()
                    : null

                return (
                  <div
                    key={filter.id}
                    className="flex items-center gap-2 group rounded-md px-2 py-1.5 bg-bg-secondary hover:bg-bg-hover transition-colors cursor-pointer"
                    onClick={() => handleEditFilter(filter)}
                  >
                    <div className="flex-1 text-xs min-w-0">
                      <span className="font-medium text-text-primary">{name}</span>
                      <span className="text-text-tertiary mx-1">{condition}</span>
                      {value && (
                        <span className="inline-flex items-center gap-1 text-text-primary">
                          {statusColor && (
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                              style={{ backgroundColor: statusColor }}
                            />
                          )}
                          {value}
                        </span>
                      )}
                    </div>
                    <Pencil className="w-3 h-3 text-text-tertiary opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        handleRemoveFilter(filter.id)
                      }}
                      className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-all shrink-0"
                    >
                      <X className="w-3.5 h-3.5 text-text-tertiary hover:text-red-500" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Step: Column selection with search */}
        {step === 'columns' && (
          <>
            {/* Search input */}
            <div className="p-3 border-b border-border-light">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter by..."
                  className="w-full pl-8 pr-3 py-2 text-sm bg-bg-secondary rounded-md border-0 focus:outline-none focus:ring-2 focus:ring-monday-primary/30 placeholder:text-text-tertiary"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-3.5 h-3.5 text-text-tertiary hover:text-text-secondary" />
                  </button>
                )}
              </div>
            </div>

            {/* Column list */}
            <div className="max-h-[280px] overflow-y-auto py-1">
              {filteredColumns.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-text-tertiary">
                  No matching columns
                </div>
              ) : (
                filteredColumns.map(col => {
                  const Icon = COLUMN_TYPE_ICONS[col.column_type] || Type
                  return (
                    <button
                      key={col.id}
                      onClick={() => handleSelectColumn(col)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-bg-hover transition-colors"
                    >
                      <Icon className="w-4 h-4 text-text-tertiary shrink-0" />
                      <span className="text-text-primary">{col.column_name}</span>
                      <span className="ml-auto text-xs text-text-tertiary capitalize">
                        {col.column_type.replace(/_/g, ' ')}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </>
        )}

        {/* Step: Operator + Value selection */}
        {step === 'value' && selectedColumn && (
          <>
            {/* Header with back button */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-light">
              <button
                onClick={handleBack}
                className="p-1 rounded hover:bg-bg-hover transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-text-secondary" />
              </button>
              <div className="flex items-center gap-2 flex-1">
                {(() => {
                  const Icon = COLUMN_TYPE_ICONS[selectedColumn.column_type] || Type
                  return <Icon className="w-4 h-4 text-text-tertiary" />
                })()}
                <span className="text-sm font-medium text-text-primary">
                  {selectedColumn.column_name}
                </span>
              </div>
              {editingFilterId && (
                <span className="text-xs text-monday-primary font-medium">Editing</span>
              )}
            </div>

            <div className="p-3 space-y-3">
              {/* Operator selector */}
              <div>
                <label className="block text-xs text-text-tertiary mb-1.5">Condition</label>
                <div className="flex flex-wrap gap-1.5">
                  {conditions.map(cond => (
                    <button
                      key={cond.value}
                      onClick={() => {
                        setSelectedOperator(cond.value)
                        setSelectedValue('')
                        // If no value needed, apply immediately
                        if (NO_VALUE_CONDITIONS.includes(cond.value)) {
                          if (editingFilterId) {
                            onFiltersChange(
                              filters.map(f =>
                                f.id === editingFilterId
                                  ? { ...f, condition: cond.value, value: null }
                                  : f
                              )
                            )
                          } else {
                            const newFilter: FilterConfig = {
                              id: `filter-${Date.now()}`,
                              column: selectedColumn.column_id,
                              condition: cond.value,
                              value: null,
                            }
                            onFiltersChange([...filters, newFilter])
                          }
                          setStep('columns')
                          setSelectedColumn(null)
                          setSelectedOperator('')
                          setEditingFilterId(null)
                        }
                      }}
                      className={cn(
                        'px-2.5 py-1 text-xs rounded-full border transition-colors',
                        selectedOperator === cond.value
                          ? 'border-monday-primary bg-monday-primary/10 text-monday-primary font-medium'
                          : 'border-border-light text-text-secondary hover:border-monday-primary/40 hover:text-text-primary'
                      )}
                    >
                      {cond.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Value input — type-specific */}
              {selectedOperator && !NO_VALUE_CONDITIONS.includes(selectedOperator) && (
                <div>
                  <label className="block text-xs text-text-tertiary mb-1.5">Value</label>
                  {renderValueInput(
                    selectedColumn,
                    selectedValue,
                    setSelectedValue,
                    handleApplyFilter,
                    handleValueKeyDown,
                    statusOptions,
                    { users, routes, serviceTypes, companies }
                  )}
                </div>
              )}

              {/* Apply button for text/number inputs */}
              {selectedOperator &&
                !NO_VALUE_CONDITIONS.includes(selectedOperator) &&
                !['status', 'person', 'checkbox', 'route', 'company', 'service_type'].includes(
                  selectedColumn.column_type
                ) && (
                  <button
                    onClick={() => handleApplyFilter()}
                    disabled={!selectedValue}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-monday-primary text-white rounded-md hover:bg-monday-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {editingFilterId ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Update filter
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        Add filter
                      </>
                    )}
                  </button>
                )}
            </div>
          </>
        )}
      </div>
    </>,
    document.body
  )
}

// Searchable list wrapper for filter value pickers
function SearchablePickerList({
  items,
  value,
  onSelect,
  getLabel,
  getKey,
  emptyMessage,
  renderIcon,
  searchPlaceholder = 'Search...',
}: {
  items: any[]
  value: string
  onSelect: (id: string) => void
  getLabel: (item: any) => string
  getKey: (item: any) => string
  emptyMessage: string
  renderIcon?: (item: any, isSelected: boolean) => React.ReactNode
  searchPlaceholder?: string
}) {
  const [query, setQuery] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const filtered = React.useMemo(() => {
    if (!query.trim()) return items
    const q = query.toLowerCase()
    return items.filter(item => getLabel(item).toLowerCase().includes(q))
  }, [items, query, getLabel])

  return (
    <div className="rounded-md border border-border-light overflow-hidden">
      <div className="px-2 py-1.5 border-b border-border-light">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-7 pr-2 py-1.5 text-xs bg-transparent border-0 focus:outline-none placeholder:text-text-tertiary"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2"
            >
              <X className="w-3 h-3 text-text-tertiary hover:text-text-secondary" />
            </button>
          )}
        </div>
      </div>
      <div className="max-h-[180px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-text-tertiary">
            {query ? 'No matches' : emptyMessage}
          </div>
        ) : (
          filtered.map(item => {
            const key = getKey(item)
            const isSelected = value === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelect(key)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-bg-hover transition-colors',
                  isSelected && 'bg-monday-primary/5'
                )}
              >
                {renderIcon?.(item, isSelected)}
                <span className="flex-1 text-text-primary truncate">{getLabel(item)}</span>
                {isSelected && <Check className="w-4 h-4 text-monday-primary shrink-0" />}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

// Render type-specific value input
function renderValueInput(
  column: BoardColumn,
  value: string,
  setValue: (v: string) => void,
  onApply: (v?: string) => void,
  onKeyDown: (e: React.KeyboardEvent) => void,
  statusOptions: StatusOption[],
  pickerData: { users?: any[]; routes?: any[]; serviceTypes?: any[]; companies?: any[] }
) {
  const colType = column.column_type

  // Person → inspector list picker with search
  if (colType === 'person') {
    const handleSelect = (id: string) => {
      setValue(id)
      onApply(id)
    }
    return (
      <SearchablePickerList
        items={pickerData.users || []}
        value={value}
        onSelect={handleSelect}
        getKey={p => p.id}
        getLabel={p => p.full_name || p.email || 'Unknown'}
        emptyMessage="No people found"
        searchPlaceholder="Search people..."
        renderIcon={p => {
          const initials = p.full_name
            ? p.full_name
                .split(/\s+/)
                .map((n: string) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)
            : '?'
          return (
            <span className="w-6 h-6 rounded-full bg-monday-primary text-text-inverse flex items-center justify-center text-[10px] font-semibold shrink-0">
              {initials}
            </span>
          )
        }}
      />
    )
  }

  // Route → route list picker with search
  if (colType === 'route') {
    const handleSelect = (id: string) => {
      setValue(id)
      onApply(id)
    }
    return (
      <SearchablePickerList
        items={pickerData.routes || []}
        value={value}
        onSelect={handleSelect}
        getKey={r => r.id}
        getLabel={r => r.name || 'Unnamed Route'}
        emptyMessage="No routes found"
        searchPlaceholder="Search routes..."
        renderIcon={() => <MapPin className="w-4 h-4 text-text-tertiary shrink-0" />}
      />
    )
  }

  // Company → company list picker with search
  if (colType === 'company') {
    const handleSelect = (id: string) => {
      setValue(id)
      onApply(id)
    }
    return (
      <SearchablePickerList
        items={pickerData.companies || []}
        value={value}
        onSelect={handleSelect}
        getKey={c => c.id}
        getLabel={c => c.name}
        emptyMessage="No companies found"
        searchPlaceholder="Search companies..."
        renderIcon={() => <Building2 className="w-4 h-4 text-text-tertiary shrink-0" />}
      />
    )
  }

  // Service Type → service type list picker with search
  if (colType === 'service_type') {
    const handleSelect = (id: string) => {
      setValue(id)
      onApply(id)
    }
    return (
      <SearchablePickerList
        items={pickerData.serviceTypes || []}
        value={value}
        onSelect={handleSelect}
        getKey={s => s.id}
        getLabel={s => s.name_ka || s.name}
        emptyMessage="No service types found"
        searchPlaceholder="Search service types..."
      />
    )
  }

  // Status → colored pills with search
  if (colType === 'status') {
    const handleSelect = (key: string) => {
      setValue(key)
      onApply(key)
    }
    return (
      <SearchablePickerList
        items={statusOptions}
        value={value}
        onSelect={handleSelect}
        getKey={o => o.key}
        getLabel={o => o.label}
        emptyMessage="No statuses"
        searchPlaceholder="Search statuses..."
        renderIcon={o => {
          const colorInfo = MONDAY_COLORS[o.color] || { hex: '#C4C4C4', text: '#FFFFFF' }
          return (
            <span
              className="w-3.5 h-3.5 rounded-sm shrink-0"
              style={{ backgroundColor: colorInfo.hex }}
            />
          )
        }}
      />
    )
  }

  // Number → number input with icon
  if (colType === 'number') {
    return (
      <div className="relative">
        <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          type="number"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Enter number..."
          autoFocus
          className="w-full pl-8 pr-3 py-2 bg-bg-primary text-text-primary border border-border-light rounded-md text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-monday-primary/30"
        />
      </div>
    )
  }

  // Date → presets + date picker
  if (colType === 'date' || colType === 'date_range') {
    return (
      <div className="space-y-2">
        {/* Quick presets */}
        <div className="grid grid-cols-2 gap-1.5">
          {DATE_PRESETS.map(preset => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                const dateVal = preset.getValue()
                setValue(dateVal)
                onApply(dateVal)
              }}
              className="px-2.5 py-1.5 text-xs text-left rounded-md border border-border-light hover:border-monday-primary/40 hover:bg-monday-primary/5 text-text-secondary hover:text-text-primary transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
        {/* Exact date picker */}
        <div className="relative">
          <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="date"
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-bg-primary text-text-primary border border-border-light rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-monday-primary/30"
          />
        </div>
      </div>
    )
  }

  // Default → text input
  return (
    <input
      type="text"
      value={value}
      onChange={e => setValue(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder="Enter value..."
      autoFocus
      className="w-full px-3 py-2 bg-bg-primary text-text-primary border border-border-light rounded-md text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-monday-primary/30"
    />
  )
}
