import { useRouter } from 'next/navigation'
import { ArrowLeft, History, FileCheck, Users, Columns } from 'lucide-react'
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
}: BoardPageHeaderProps) {
  const router = useRouter()

  return (
    <div className="flex-shrink-0 bg-bg-primary border-b border-border-light">
      <div className="w-full mx-auto px-4 md:px-6 py-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-4 gap-2">
          <button
            onClick={() => router.push('/boards')}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline text-sm">Back to Boards</span>
          </button>

          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <BoardPresenceIndicator
              presence={presence}
              isConnected={isConnected}
            />

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

            <Button variant="secondary" size="sm" onClick={onShowColumnConfig}>
              <Columns className="w-4 h-4 mr-2" />
              Columns
            </Button>
          </div>
        </div>

        {/* Board Title */}
        <div className="flex items-center gap-4">
          <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', getBoardColorClass(board.color))}>
            <span className="text-white text-xl font-bold">
              {board.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-h2 font-bold text-text-primary">
              {board.name}
            </h1>
            {board.description && (
              <p className="text-sm text-text-tertiary mt-1">
                {board.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
