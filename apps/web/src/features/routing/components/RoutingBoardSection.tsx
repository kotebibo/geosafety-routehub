'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, Loader2, User, Check, Route as RouteIcon, CalendarDays } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { UrgencyBadge } from './UrgencyBadge'
import { ItemDetailPopup } from './ItemDetailPopup'
import { InspectorLocationControl } from './InspectorLocationControl'
import { AssignOfficerControl } from './AssignOfficerControl'
import { WeeklyPlanner } from './WeeklyPlanner'
import { RoutePlanningPopup } from './RoutePlanningPopup'
import { useRoutingItems, useBoardWeekPlan, type RoutingItem } from '../hooks/useRoutingData'
import { dayLabelOf, shortDate } from '../lib/week'
import type { Board } from '@/types/board'

// Same palette the sidebar uses for board avatars
const BOARD_COLORS: Record<string, string> = {
  blue: 'bg-monday-primary',
  green: 'bg-status-done',
  red: 'bg-status-stuck',
  yellow: 'bg-status-working',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  primary: 'bg-monday-primary',
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

interface RoutingBoardSectionProps {
  board: Board
}

export function RoutingBoardSection({ board }: RoutingBoardSectionProps) {
  const t = useTranslations()
  const [expanded, setExpanded] = useState(false)
  const [weekPlanning, setWeekPlanning] = useState(false)
  const { isAdmin } = useAuth()

  return (
    <div
      className={cn(
        'rounded-xl border transition-colors overflow-hidden',
        expanded ? 'border-monday-primary bg-bg-primary' : 'border-border-light bg-bg-primary'
      )}
    >
      {/* Board row — sidebar-style: letter avatar + name + location + chevron.
          A div (not a button) so the location control can nest without invalid
          nested-button markup; the row area itself toggles expand. */}
      <div
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-bg-hover cursor-pointer',
          expanded && 'bg-bg-selected'
        )}
        onClick={() => setExpanded(v => !v)}
      >
        <div
          className={cn(
            'w-6 h-6 rounded flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0',
            BOARD_COLORS[board.color || 'primary'] || 'bg-monday-primary'
          )}
        >
          {board.name.charAt(0).toUpperCase()}
        </div>
        <span
          className={cn(
            'flex-1 text-left text-sm font-medium truncate',
            expanded ? 'text-monday-primary' : 'text-text-primary'
          )}
        >
          {board.name}
        </span>
        {/* Admin assigns the officer this board belongs to */}
        {isAdmin && <AssignOfficerControl board={board} />}
        {/* Weekly route planner */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            setWeekPlanning(true)
          }}
          title={t('routing.weekPlanning')}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-bg-tertiary text-text-tertiary hover:bg-bg-hover transition-colors flex-shrink-0"
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('routing.planWeekShort')}</span>
        </button>
        {/* Inspector starting location for this board — admin-only, like the
            officer profile fields (car/engine/fuel/location). Officers can't
            change routing locations, they only execute the planned routes. */}
        {isAdmin && <InspectorLocationControl board={board} />}
        <ChevronDown
          className={cn(
            'w-4 h-4 text-text-tertiary transition-transform flex-shrink-0',
            expanded && 'rotate-180'
          )}
        />
      </div>

      {/* Items load lazily — the inner component mounts (and fetches) only on expand */}
      {expanded && <BoardItemsList board={board} />}
      {weekPlanning && <WeeklyPlanner board={board} onClose={() => setWeekPlanning(false)} />}
    </div>
  )
}

const PAGE_SIZE = 15

function BoardItemsList({ board }: { board: Board }) {
  const t = useTranslations()
  const plannedByItemId = useBoardWeekPlan(board)
  const { items, overdueCount, plannedCount, isLoading } = useRoutingItems(
    board.id,
    plannedByItemId
  )
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [openedItem, setOpenedItem] = useState<RoutingItem | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [planning, setPlanning] = useState(false)

  const toggleSelect = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const selectedItems = useMemo(
    () => items.filter(ri => selected.has(ri.item.id)),
    [items, selected]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 border-t border-border-light">
        <Loader2 className="w-5 h-5 text-text-tertiary animate-spin" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <p className="px-4 py-4 text-sm text-text-tertiary border-t border-border-light">
        {t('routing.emptyBoard')}
      </p>
    )
  }

  return (
    <div className="border-t border-border-light">
      <div className="flex items-center gap-2 px-4 py-2 text-xs text-text-tertiary">
        <span>{t('routing.companiesCount', { count: items.length })}</span>
        {plannedCount > 0 && (
          <span className="px-2 py-0.5 rounded-full font-medium bg-monday-primary/10 text-monday-primary border border-monday-primary/30">
            {t('routing.plannedThisWeek', { count: plannedCount })}
          </span>
        )}
        {overdueCount > 0 && (
          <span className="px-2 py-0.5 rounded-full font-medium bg-red-500/10 text-red-500 border border-red-500/30">
            {t('routing.overdueCount', { count: overdueCount })}
          </span>
        )}
      </div>
      <div className="divide-y divide-border-light">
        {items.slice(0, visibleCount).map(ri => (
          <ItemRow
            key={ri.item.id}
            routingItem={ri}
            selected={selected.has(ri.item.id)}
            onToggleSelect={() => toggleSelect(ri.item.id)}
            onOpen={() => setOpenedItem(ri)}
          />
        ))}
      </div>

      {items.length > visibleCount && (
        <button
          type="button"
          onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
          className="w-full px-4 py-2.5 text-sm font-medium text-monday-primary hover:bg-bg-hover transition-colors border-t border-border-light"
        >
          {t('routing.showMore', { count: items.length - visibleCount })}
        </button>
      )}

      {/* Selection action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 border-t border-border-light bg-bg-secondary">
          <span className="text-xs text-text-secondary">
            {t('routing.selectedCount', { count: selected.size })}
          </span>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-xs text-text-tertiary hover:text-text-primary"
          >
            {t('routing.clearSelection')}
          </button>
          <button
            type="button"
            onClick={() => setPlanning(true)}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-monday-primary text-white text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <RouteIcon className="w-3.5 h-3.5" />
            {t('routing.planRouteWithCount', { count: selected.size })}
          </button>
        </div>
      )}

      {openedItem && (
        <ItemDetailPopup
          routingItem={openedItem}
          board={board}
          onClose={() => setOpenedItem(null)}
        />
      )}
      {planning && (
        <RoutePlanningPopup
          board={board}
          items={selectedItems}
          onClose={() => setPlanning(false)}
        />
      )}
    </div>
  )
}

interface ItemRowProps {
  routingItem: RoutingItem
  selected: boolean
  onToggleSelect: () => void
  onOpen: () => void
}

function ItemRow({ routingItem, selected, onToggleSelect, onOpen }: ItemRowProps) {
  const t = useTranslations()
  const { item, group, summary, daysLeft, hasActiveCheckin, neverVisited, plannedDay } = routingItem

  const lastVisit = summary?.latest_created_at ? new Date(summary.latest_created_at) : null
  const lastVisitStr = lastVisit
    ? `${lastVisit.getDate().toString().padStart(2, '0')}/${(lastVisit.getMonth() + 1).toString().padStart(2, '0')}/${lastVisit.getFullYear()}`
    : null

  // "სამ 21.07" chip for items on this week's plan
  let plannedChip: string | null = null
  if (plannedDay) {
    const [py, pm, pd] = plannedDay.date.split('-').map(Number)
    plannedChip = `${dayLabelOf(plannedDay.date)} ${shortDate(new Date(py, pm - 1, pd))}`
  }

  return (
    <div
      className={cn(
        'w-full flex items-center gap-2 px-3 py-1.5 transition-colors',
        selected ? 'bg-monday-primary/5' : 'hover:bg-bg-hover'
      )}
    >
      {/* Selection checkbox */}
      <button
        type="button"
        onClick={onToggleSelect}
        aria-label={t('routing.selectCompany')}
        className={cn(
          'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
          selected
            ? 'bg-monday-primary border-monday-primary text-white'
            : 'border-border-medium hover:border-monday-primary'
        )}
      >
        {selected && <Check className="w-3 h-3" />}
      </button>

      {/* The rest opens the detail popup */}
      <button
        type="button"
        onClick={onOpen}
        className="flex-1 flex items-center gap-2.5 min-w-0 text-left"
      >
        {/* Company avatar — same style as board rows, tinted by its category color */}
        <div
          className={cn(
            'w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0',
            (group && GROUP_DOT_COLORS[group.color]) || 'bg-monday-primary'
          )}
        >
          {item.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {plannedChip && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-monday-primary/10 text-monday-primary border border-monday-primary/30 flex-shrink-0">
                <CalendarDays className="w-3 h-3" />
                {plannedChip}
                {plannedDay && <span className="opacity-70">#{plannedDay.position}</span>}
              </span>
            )}
            <p className="text-sm font-medium text-text-primary truncate">{item.name}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            {group && <span className="truncate">{group.name}</span>}
            {lastVisitStr && (
              <span className="flex-shrink-0">
                {t('routing.lastVisit', { date: lastVisitStr })}
              </span>
            )}
            {summary?.latest_inspector_name && (
              <span className="inline-flex items-center gap-1 flex-shrink-0">
                <User className="w-3 h-3" />
                {summary.latest_inspector_name}
              </span>
            )}
          </div>
        </div>
        <UrgencyBadge
          daysLeft={daysLeft}
          hasActiveCheckin={hasActiveCheckin}
          neverVisited={neverVisited}
        />
      </button>
    </div>
  )
}
