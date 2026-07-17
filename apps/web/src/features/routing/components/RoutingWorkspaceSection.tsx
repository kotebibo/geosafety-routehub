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
        'rounded-lg border transition-colors overflow-hidden bg-bg-primary',
        expanded ? 'border-monday-primary' : 'border-border-light'
      )}
    >
      {/* Workspace row — same markup as the sidebar workspace dropdown */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors hover:bg-bg-hover',
          expanded && 'bg-bg-selected text-monday-primary'
        )}
      >
        {shared ? (
          <Users className="w-4 h-4 flex-shrink-0 text-text-tertiary" />
        ) : (
          <div className="w-5 h-5 rounded bg-monday-primary flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            {(name || 'W').charAt(0).toUpperCase()}
          </div>
        )}
        <span className="flex-1 truncate text-left">{name}</span>
        <span className="text-xs text-text-tertiary flex-shrink-0">{boards.length}</span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-text-tertiary transition-transform flex-shrink-0',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {/* Boards inside — expand like the sidebar does */}
      {expanded && (
        <div className="border-t border-border-light px-2 py-2 space-y-1.5 bg-bg-secondary/50">
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
