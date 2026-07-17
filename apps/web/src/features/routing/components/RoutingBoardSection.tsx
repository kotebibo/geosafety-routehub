'use client'

import { useState } from 'react'
import { ChevronDown, Loader2, User } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { UrgencyBadge } from './UrgencyBadge'
import { ItemDetailPopup } from './ItemDetailPopup'
import { useRoutingItems, type RoutingItem } from '../hooks/useRoutingData'
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
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={cn(
        'rounded-xl border transition-colors overflow-hidden',
        expanded ? 'border-monday-primary bg-bg-primary' : 'border-border-light bg-bg-primary'
      )}
    >
      {/* Board row — sidebar-style: letter avatar + name + chevron */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-bg-hover',
          expanded && 'bg-bg-selected'
        )}
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
        <ChevronDown
          className={cn(
            'w-4 h-4 text-text-tertiary transition-transform flex-shrink-0',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {/* Items load lazily — the inner component mounts (and fetches) only on expand */}
      {expanded && <BoardItemsList board={board} />}
    </div>
  )
}

const PAGE_SIZE = 15

function BoardItemsList({ board }: { board: Board }) {
  const t = useTranslations()
  const { items, overdueCount, isLoading } = useRoutingItems(board.id)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [openedItem, setOpenedItem] = useState<RoutingItem | null>(null)

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
        {overdueCount > 0 && (
          <span className="px-2 py-0.5 rounded-full font-medium bg-red-500/10 text-red-500 border border-red-500/30">
            {t('routing.overdueCount', { count: overdueCount })}
          </span>
        )}
      </div>
      <div className="divide-y divide-border-light">
        {items.slice(0, visibleCount).map(ri => (
          <ItemRow key={ri.item.id} routingItem={ri} onClick={() => setOpenedItem(ri)} />
        ))}
      </div>
      {openedItem && (
        <ItemDetailPopup
          routingItem={openedItem}
          board={board}
          onClose={() => setOpenedItem(null)}
        />
      )}
      {items.length > visibleCount && (
        <button
          type="button"
          onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
          className="w-full px-4 py-2.5 text-sm font-medium text-monday-primary hover:bg-bg-hover transition-colors border-t border-border-light"
        >
          {t('routing.showMore', { count: items.length - visibleCount })}
        </button>
      )}
    </div>
  )
}

function ItemRow({ routingItem, onClick }: { routingItem: RoutingItem; onClick: () => void }) {
  const t = useTranslations()
  const { item, group, summary, daysLeft, hasActiveCheckin, neverVisited } = routingItem

  const lastVisit = summary?.latest_created_at ? new Date(summary.latest_created_at) : null
  const lastVisitStr = lastVisit
    ? `${lastVisit.getDate().toString().padStart(2, '0')}/${(lastVisit.getMonth() + 1).toString().padStart(2, '0')}/${lastVisit.getFullYear()}`
    : null

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-bg-hover transition-colors text-left"
    >
      {/* Company avatar — same style as board rows, tinted by its category color */}
      <div
        className={cn(
          'w-6 h-6 rounded flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0',
          (group && GROUP_DOT_COLORS[group.color]) || 'bg-monday-primary'
        )}
      >
        {item.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{item.name}</p>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          {group && <span className="truncate">{group.name}</span>}
          {lastVisitStr && (
            <span className="flex-shrink-0">{t('routing.lastVisit', { date: lastVisitStr })}</span>
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
  )
}
