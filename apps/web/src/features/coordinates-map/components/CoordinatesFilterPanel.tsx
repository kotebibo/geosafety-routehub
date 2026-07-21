'use client'

import { useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Search, X, MapPin, RefreshCw, PanelLeftClose, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getInspectorColor } from '../lib/colors'
import type { CoordinateItem } from '../types'

interface CoordinatesFilterPanelProps {
  items: CoordinateItem[]
  allItems: CoordinateItem[]
  inspectors: string[]
  selectedInspector: string
  onInspectorChange: (value: string) => void
  searchQuery: string
  onSearchChange: (value: string) => void
  selectedItemId: string | null
  onSelectItem: (item: CoordinateItem) => void
  lastUpdated: Date | null
  isLoading: boolean
  isRefreshing: boolean
  onRefresh: () => void
  onCollapse: () => void
}

export function CoordinatesFilterPanel({
  items,
  allItems,
  inspectors,
  selectedInspector,
  onInspectorChange,
  searchQuery,
  onSearchChange,
  selectedItemId,
  onSelectItem,
  lastUpdated,
  isLoading,
  isRefreshing,
  onRefresh,
  onCollapse,
}: CoordinatesFilterPanelProps) {
  const t = useTranslations()
  const listRef = useRef<HTMLDivElement>(null)

  const inspectorCounts = useMemo(() => {
    const counts = new Map<string, number>()
    allItems.forEach(item => {
      counts.set(item.inspector, (counts.get(item.inspector) || 0) + 1)
    })
    return counts
  }, [allItems])

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 56,
    overscan: 10,
  })

  const hasActiveFilters = Boolean(selectedInspector || searchQuery)

  return (
    <div className="w-80 border-r border-border-light bg-bg-primary flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-light">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <MapPin className="w-4 h-4 text-monday-primary" />
            {t('coordinatesMap.filterPanel.title')}
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-bg-tertiary text-text-secondary">
              {items.length}
              {items.length !== allItems.length && ` / ${allItems.length}`}
            </span>
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title={t('coordinatesMap.filterPanel.refresh')}
              className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onCollapse}
              title={t('coordinatesMap.filterPanel.hidePanel')}
              className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {lastUpdated && (
          <div className="text-[10px] text-text-tertiary mt-1">
            {t('coordinatesMap.filterPanel.updatedAt')} {lastUpdated.toLocaleTimeString('ka-GE')}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-3 pt-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
          <input
            type="text"
            placeholder={t('coordinatesMap.filterPanel.searchPlaceholder')}
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 text-sm border border-border-medium rounded-md bg-bg-secondary text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-border-focus focus:border-border-focus"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Inspectors */}
      <div className="px-3 pt-3">
        <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide mb-1.5">
          {t('coordinatesMap.filterPanel.inspectorsTitle')}
        </div>
        <div className="max-h-44 overflow-y-auto space-y-0.5 pr-1">
          <button
            onClick={() => onInspectorChange('')}
            className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-xs transition-colors ${
              selectedInspector === ''
                ? 'bg-bg-selected text-text-primary font-medium'
                : 'text-text-secondary hover:bg-bg-hover'
            }`}
          >
            <span>{t('coordinatesMap.filterPanel.allInspectors', { count: allItems.length })}</span>
          </button>
          {inspectors.map(name => (
            <button
              key={name}
              onClick={() => onInspectorChange(selectedInspector === name ? '' : name)}
              className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-xs transition-colors ${
                selectedInspector === name
                  ? 'bg-bg-selected text-text-primary font-medium'
                  : 'text-text-secondary hover:bg-bg-hover'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: getInspectorColor(name, inspectors) }}
              />
              <span className="truncate flex-1 text-left">{name || '—'}</span>
              <span className="text-text-tertiary">{inspectorCounts.get(name) || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 flex flex-col min-h-0 mt-3 border-t border-border-light">
        <div className="px-3 py-2 flex items-center justify-between">
          <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide">
            {t('coordinatesMap.filterPanel.itemsTitle')}
          </span>
          {hasActiveFilters && (
            <button
              onClick={() => {
                onInspectorChange('')
                onSearchChange('')
              }}
              className="text-[11px] text-text-link hover:underline"
            >
              {t('coordinatesMap.filterPanel.clearFilters')}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw className="w-4 h-4 animate-spin text-text-tertiary" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center px-4">
            <p className="text-xs text-text-tertiary text-center">
              {t('coordinatesMap.filterPanel.noResults')}
            </p>
          </div>
        ) : (
          <div ref={listRef} className="flex-1 overflow-y-auto">
            <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
              {virtualizer.getVirtualItems().map(row => {
                const item = items[row.index]
                const isSelected = item.id === selectedItemId
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className={`absolute left-0 w-full px-3 text-left group ${
                      isSelected ? 'bg-bg-selected' : 'hover:bg-bg-hover'
                    }`}
                    style={{ top: row.start, height: row.size }}
                  >
                    <div className="flex items-center gap-2 h-full border-b border-border-light">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: getInspectorColor(item.inspector, inspectors) }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`text-xs truncate ${
                              isSelected ? 'text-text-primary font-medium' : 'text-text-primary'
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.points.length > 1 && (
                            <span
                              title={t('coordinatesMap.filterPanel.pointsCount', {
                                count: item.points.length,
                              })}
                              className="flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] bg-bg-tertiary text-text-secondary"
                            >
                              {item.points.length}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-text-tertiary truncate">
                          {item.inspector || '—'}
                          {item.sk && ` · ${item.sk}`}
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
