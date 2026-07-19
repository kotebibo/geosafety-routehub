'use client'

import { useMemo } from 'react'
import { Loader2, Waypoints } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import { useUserBoards } from '@/features/boards/hooks'
import { useWorkspaces } from '@/features/workspaces/hooks'
import { RoutingWorkspaceSection } from './RoutingWorkspaceSection'
import type { Board } from '@/types/board'

interface WorkspaceEntry {
  id: string
  name: string
  boards: Board[]
}

export function RoutingPage() {
  const t = useTranslations()
  const { user, loading: authLoading } = useAuth()
  const isAuthReady = !authLoading && !!user

  // Same sources and grouping the sidebar uses — workspaces and boards added
  // there show up here automatically
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces(isAuthReady)
  const { data: allBoards, isLoading: boardsLoading } = useUserBoards(isAuthReady ? user!.id : '')

  const { workspaceEntries, sharedBoards } = useMemo(() => {
    if (!allBoards) return { workspaceEntries: [] as WorkspaceEntry[], sharedBoards: [] as Board[] }

    // Workspace context from board-embedded data, enriched by full workspace rows
    const wsContextMap = new Map<string, { id: string; name: string }>()
    allBoards.forEach((board: any) => {
      if (board.workspace_id && board.workspace && !wsContextMap.has(board.workspace_id)) {
        wsContextMap.set(board.workspace_id, board.workspace)
      }
    })
    if (workspaces) {
      workspaces.forEach((ws: any) => wsContextMap.set(ws.id, ws))
    }

    const grouped = new Map<string, Board[]>()
    const shared: Board[] = []
    wsContextMap.forEach((_, wsId) => grouped.set(wsId, []))

    allBoards.forEach((board: any) => {
      if (board.settings?.is_archived) return
      const wsId = board.workspace_id
      if (wsId && grouped.has(wsId)) grouped.get(wsId)!.push(board)
      else shared.push(board)
    })

    const entries: WorkspaceEntry[] = Array.from(wsContextMap.entries()).map(([id, ws]) => ({
      id,
      name: ws.name,
      boards: grouped.get(id) || [],
    }))

    return { workspaceEntries: entries, sharedBoards: shared }
  }, [allBoards, workspaces])

  const loading = authLoading || workspacesLoading || boardsLoading

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-monday-primary/10 flex items-center justify-center">
            <Waypoints className="w-5 h-5 text-monday-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{t('routing.title')}</h1>
            <p className="text-sm text-text-secondary">{t('routing.subtitle')}</p>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-text-tertiary animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && workspaceEntries.length === 0 && sharedBoards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-text-secondary">{t('routing.noBoards')}</p>
          </div>
        )}

        {/* Workspaces — same rows as the sidebar workspace dropdown */}
        {!loading && (
          <div className="space-y-2">
            {workspaceEntries.map(entry => (
              <RoutingWorkspaceSection key={entry.id} name={entry.name} boards={entry.boards} />
            ))}
            {sharedBoards.length > 0 && (
              <RoutingWorkspaceSection
                name={t('routing.sharedWithMe')}
                boards={sharedBoards}
                shared
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
