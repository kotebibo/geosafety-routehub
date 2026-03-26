import { History, FileCheck, Users, Columns, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/shared/components/ui'
import { BoardPresenceIndicator } from './BoardPresence'
import type { BoardPresence } from '../types/board'

interface BoardPageHeaderProps {
  board: {
    name: string
    description?: string
    color?: string
  }
  presence: BoardPresence[]
  isConnected: boolean
  onShowActivityLog: () => void
  onShowSaveAsTemplate: () => void
  onShowAccessModal: () => void
  onShowColumnConfig: () => void
  onShowDocTemplates?: () => void
}

function getBoardColorClass(color?: string) {
  const colorMap: Record<string, string> = {
    blue: 'bg-monday-primary',
    green: 'bg-status-done',
    red: 'bg-status-stuck',
    yellow: 'bg-status-working',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  }
  return colorMap[color || 'blue'] || 'bg-monday-primary'
}

export function BoardPageHeader({
  board,
  presence,
  isConnected,
  onShowActivityLog,
  onShowSaveAsTemplate,
  onShowAccessModal,
  onShowColumnConfig,
  onShowDocTemplates,
}: BoardPageHeaderProps) {
  return (
    <div className="flex-shrink-0 bg-bg-primary border-b border-border-light">
      <div className="w-full mx-auto px-4 md:px-6 py-2">
        <div className="flex items-center justify-between gap-2">
          {/* Board Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                'w-8 h-8 rounded-md flex-shrink-0 flex items-center justify-center',
                getBoardColorClass(board.color)
              )}
            >
              <span className="text-white text-sm font-bold">
                {board.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <h1 className="text-base font-semibold text-text-primary truncate">{board.name}</h1>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <BoardPresenceIndicator presence={presence} isConnected={isConnected} />

            <Button variant="secondary" size="sm" onClick={onShowActivityLog}>
              <History className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Activity</span>
            </Button>

            <Button variant="secondary" size="sm" onClick={onShowSaveAsTemplate}>
              <FileCheck className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Save Template</span>
            </Button>

            <Button variant="secondary" size="sm" onClick={onShowAccessModal}>
              <Users className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Access</span>
            </Button>

            {onShowDocTemplates && (
              <Button variant="secondary" size="sm" onClick={onShowDocTemplates}>
                <FileText className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Doc Templates</span>
              </Button>
            )}

            <Button variant="secondary" size="sm" onClick={onShowColumnConfig}>
              <Columns className="w-4 h-4 mr-2" />
              Columns
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
