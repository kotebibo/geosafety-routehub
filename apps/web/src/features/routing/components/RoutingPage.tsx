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
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-monday-primary to-monday-purple p-6 shadow-lg mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="pointer-events-none absolute -top-10 -right-8 w-44 h-44 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-6 w-36 h-36 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/25 flex items-center justify-center flex-shrink-0">
              <Waypoints className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{t('routing.title')}</h1>
              <p className="text-sm text-white/80">{t('routing.subtitle')}</p>
            </div>
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
          <div className="rounded-3xl bg-bg-primary border border-border-light p-12 text-center shadow-sm animate-in fade-in duration-500">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-monday-primary/10 flex items-center justify-center mb-4">
              <Waypoints className="w-8 h-8 text-monday-primary" />
            </div>
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
