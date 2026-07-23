'use client'

import { useState } from 'react'
import { ChevronDown, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { RoutingBoardSection } from './RoutingBoardSection'
import type { Board } from '@/types/board'

interface RoutingWorkspaceSectionProps {
  name: string
  boards: Board[]
  /** Renders the "Shared with me" style row (Users icon instead of a letter avatar) */
  shared?: boolean
}

export function RoutingWorkspaceSection({
  name,
  boards,
  shared = false,
}: RoutingWorkspaceSectionProps) {
  const t = useTranslations()
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={cn(
        'rounded-2xl border shadow-sm transition-all overflow-hidden bg-bg-primary',
        expanded ? 'border-monday-primary/50 shadow-md' : 'border-border-light hover:shadow-md'
      )}
    >
      {/* Workspace row */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className={cn(
          'flex items-center gap-2.5 w-full px-3.5 py-3 text-sm transition-colors',
          expanded ? 'bg-monday-primary/5' : 'hover:bg-bg-hover'
        )}
      >
        {shared ? (
          <div className="w-7 h-7 rounded-lg bg-bg-tertiary flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-text-tertiary" />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-monday-primary to-monday-purple flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {(name || 'W').charAt(0).toUpperCase()}
          </div>
        )}
        <span
          className={cn(
            'flex-1 truncate text-left font-semibold',
            expanded ? 'text-monday-primary' : 'text-text-primary'
          )}
        >
          {name}
        </span>
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-bg-tertiary text-text-secondary flex-shrink-0">
          {boards.length}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-text-tertiary transition-transform flex-shrink-0',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {/* Boards inside */}
      {expanded && (
        <div className="border-t border-border-light px-2.5 py-2.5 space-y-2 bg-bg-secondary/40 animate-in fade-in slide-in-from-top-1 duration-300">
          {boards.length === 0 ? (
            <p className="px-2 py-2 text-xs text-text-tertiary">{t('routing.noBoards')}</p>
          ) : (
            boards.map(board => <RoutingBoardSection key={board.id} board={board} />)
          )}
        </div>
      )}
    </div>
  )
}
