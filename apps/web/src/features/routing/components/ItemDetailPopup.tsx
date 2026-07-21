'use client'

import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { ExternalLink, LayoutDashboard, MapPin, Navigation, User, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useLanguage } from '@/contexts/LanguageContext'
import { useBoardColumns } from '@/features/boards/hooks/useBoardColumns'
import { useSetItemCoords } from '../hooks/useSetItemCoords'
import { useUsers } from '@/hooks/useUsers'
import { parseCoordinates } from '@/lib/geo-utils'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui-monday/Toast'
import { DEFAULT_GEOCODE_CITY } from '../lib/geocode'
import { resolveLocationColumns } from '../lib/location-columns'
import { LocationSearchField, type PickedLocation } from './LocationSearchField'
import { UrgencyBadge } from './UrgencyBadge'
import type { RoutingItem } from '../hooks/useRoutingData'
import type { Board, BoardColumn } from '@/types/board'

// Interactive/meta column types that carry no displayable value
const HIDDEN_COLUMN_TYPES = new Set(['updates', 'checkin', 'actions'])

function hasValue(value: any): boolean {
  if (value === null || value === undefined || value === '') return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') {
    return Object.values(value).some(v => v !== null && v !== undefined && v !== '')
  }
  return true
}

const GROUP_DOT_COLORS: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  purple: 'bg-purple-500',
  yellow: 'bg-yellow-500',
  pink: 'bg-pink-500',
  teal: 'bg-teal-500',
}

interface ItemDetailPopupProps {
  routingItem: RoutingItem
  board: Board
  onClose: () => void
}

export function ItemDetailPopup({ routingItem, board, onClose }: ItemDetailPopupProps) {
  const t = useTranslations()
  const { language } = useLanguage()
  const { item, group, summary, daysLeft, hasActiveCheckin, neverVisited } = routingItem
  // NOTE: visibleOnly=true would fetch by board TYPE and ignore boardId (pulls
  // other boards' columns) — fetch this board's columns and filter here instead
  const { data: columns = [], isLoading } = useBoardColumns(board.board_type, board.id)
  const { users } = useUsers()

  const userNameById = useMemo(
    () => new Map(users.map(u => [u.id, u.full_name || u.email || ''])),
    [users]
  )

  const { showToast } = useToast()
  const setItemCoords = useSetItemCoords(board.id)
  const [showPicker, setShowPicker] = useState(false)
  // Reflects a just-saved coordinate immediately (the popup holds a snapshot of
  // the item, so it wouldn't otherwise update until reopened).
  const [localCoords, setLocalCoords] = useState<{ lat: number; lng: number } | null>(null)

  // Location columns (coordinates optional per board). Coordinates come from the
  // address via geocoding; distance calculation reads the coordinates column.
  const { coordsColumnId, addressColumnId } = useMemo(
    () => resolveLocationColumns(columns),
    [columns]
  )
  const coords =
    localCoords ?? (coordsColumnId ? parseCoordinates(item.data?.[coordsColumnId]) : null)
  const address = addressColumnId ? String(item.data?.[addressColumnId] ?? '').trim() : ''

  // Save a picked location into the coordinates column — same search/pick flow
  // as setting an inspector location, so the user chooses the right match
  // (free-text geocoding of Georgian addresses is otherwise unreliable).
  const saveCoords = async (picked: PickedLocation) => {
    if (!coordsColumnId) return
    try {
      await setItemCoords.mutateAsync({
        itemId: item.id,
        coordsColumnId,
        lat: picked.lat,
        lng: picked.lng,
      })
      setLocalCoords({ lat: picked.lat, lng: picked.lng })
      setShowPicker(false)
      showToast(t('routing.locationSaved'), 'success')
    } catch (err: any) {
      showToast(err?.error || t('routing.geocodeFailed'), 'error')
    }
  }

  // Only what the board shows (is_visible) and only filled-in values. The
  // coordinates column is rendered in its own row, so exclude it here.
  const visibleColumns = useMemo(
    () =>
      columns
        .filter(
          c =>
            c.is_visible &&
            !HIDDEN_COLUMN_TYPES.has(c.column_type) &&
            c.column_id !== coordsColumnId &&
            hasValue(item.data?.[c.column_id])
        )
        .sort((a, b) => a.position - b.position),
    [columns, item.data, coordsColumnId]
  )

  const columnLabel = (col: BoardColumn) =>
    language === 'ka' ? col.column_name_ka || col.column_name : col.column_name

  const lastVisit = summary?.latest_created_at ? new Date(summary.latest_created_at) : null
  const lastVisitStr = lastVisit
    ? `${lastVisit.getDate().toString().padStart(2, '0')}/${(lastVisit.getMonth() + 1).toString().padStart(2, '0')}/${lastVisit.getFullYear()}`
    : null

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Popup */}
      <div className="relative bg-bg-primary w-full max-w-lg max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border-light">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                'w-8 h-8 rounded flex items-center justify-center text-white text-sm font-semibold flex-shrink-0',
                (group && GROUP_DOT_COLORS[group.color]) || 'bg-monday-primary'
              )}
            >
              {item.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-text-primary truncate">{item.name}</h3>
              {group && <p className="text-xs text-text-tertiary truncate">{group.name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Deep link — the board page opens this item's detail drawer via ?item= */}
            <Link
              href={`/boards/${board.id}?item=${item.id}`}
              title={t('routing.openInBoard')}
              className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-monday-primary hover:bg-bg-hover transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              {t('routing.openInBoard')}
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Visit status strip */}
        <div className="flex items-center gap-3 px-5 py-3 bg-bg-secondary border-b border-border-light">
          <UrgencyBadge
            daysLeft={daysLeft}
            hasActiveCheckin={hasActiveCheckin}
            neverVisited={neverVisited}
          />
          {lastVisitStr && (
            <span className="text-xs text-text-secondary">
              {t('routing.lastVisit', { date: lastVisitStr })}
            </span>
          )}
          {summary?.latest_inspector_name && (
            <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
              <User className="w-3 h-3" />
              {summary.latest_inspector_name}
            </span>
          )}
        </div>

        {/* Column data — everything the dashboard shows */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {isLoading ? (
            <p className="py-6 text-sm text-text-tertiary text-center">{t('routing.loading')}</p>
          ) : (
            <dl className="divide-y divide-border-light">
              {/* Coordinates — shown when set, otherwise picked from the address
                  (search + choose, same flow as setting a location) */}
              {coordsColumnId && (
                <div className="flex items-start gap-4 py-2.5">
                  <dt className="w-36 flex-shrink-0 text-xs font-medium text-text-tertiary pt-1.5 truncate">
                    {t('routing.coordinates')}
                  </dt>
                  <dd className="flex-1 min-w-0 text-sm text-text-primary break-words">
                    {coords && !showPicker && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-monday-primary hover:underline"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                        </a>
                        <button
                          type="button"
                          onClick={() => setShowPicker(true)}
                          className="text-[11px] text-text-tertiary hover:text-monday-primary"
                        >
                          {t('common.edit')}
                        </button>
                      </div>
                    )}

                    {!coords && !showPicker && (
                      <button
                        type="button"
                        onClick={() => setShowPicker(true)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/30 text-xs font-medium hover:bg-orange-500/20 transition-colors"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        {t('routing.convertFromAddress')}
                      </button>
                    )}

                    {showPicker && (
                      <LocationSearchField
                        label=""
                        value={null}
                        onChange={v => v && saveCoords(v)}
                        initialQuery={address}
                        city={DEFAULT_GEOCODE_CITY}
                      />
                    )}
                  </dd>
                </div>
              )}
              {visibleColumns.map(col => (
                <FieldRow
                  key={col.id}
                  label={columnLabel(col)}
                  column={col}
                  value={item.data?.[col.column_id]}
                  userNameById={userNameById}
                />
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

interface FieldRowProps {
  label: string
  column: BoardColumn
  value: any
  userNameById: Map<string, string>
}

function FieldRow({ label, column, value, userNameById }: FieldRowProps) {
  const t = useTranslations()
  const coords = typeof value === 'string' ? parseCoordinates(value) : null

  return (
    <div className="flex items-start gap-4 py-2.5">
      <dt className="w-36 flex-shrink-0 text-xs font-medium text-text-tertiary pt-0.5 truncate">
        {label}
      </dt>
      <dd className="flex-1 min-w-0 text-sm text-text-primary break-words">
        <FieldValue column={column} value={value} userNameById={userNameById} />
        {coords && (
          <a
            href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 ml-2 text-xs text-monday-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            {t('routing.openMap')}
          </a>
        )}
      </dd>
    </div>
  )
}

function FieldValue({ column, value, userNameById }: Omit<FieldRowProps, 'label'>) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-text-tertiary">—</span>
  }

  switch (column.column_type) {
    case 'status': {
      const options: any[] = Array.isArray(column.config?.options) ? column.config.options : []
      const option = options.find(o => o.key === value)
      return <span>{option?.label || String(value)}</span>
    }
    case 'person': {
      const name = typeof value === 'string' ? userNameById.get(value) : null
      return <span>{name || String(value)}</span>
    }
    case 'date': {
      const d = new Date(value)
      return <span>{isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('ka-GE')}</span>
    }
    case 'checkbox':
      return <span>{value ? '✓' : '—'}</span>
    case 'files': {
      const count = Array.isArray(value) ? value.length : 1
      return <span className="text-text-secondary">{count} 📎</span>
    }
    default: {
      if (Array.isArray(value)) {
        return (
          <span>{value.map(v => (typeof v === 'object' ? (v?.value ?? '') : v)).join(', ')}</span>
        )
      }
      if (typeof value === 'object') {
        // date_range and similar composite values: join defined parts
        const parts = Object.values(value).filter(v => typeof v === 'string' && v)
        return <span>{parts.length ? parts.join(' — ') : '—'}</span>
      }
      return <span>{String(value)}</span>
    }
  }
}
