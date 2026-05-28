import { useState, useRef, useEffect } from 'react'
import { History, FileCheck, Users, Columns, FileText, MoreVertical } from 'lucide-react'
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mobileMenuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [mobileMenuOpen])

  const menuItems = [
    { icon: History, label: 'Activity', onClick: onShowActivityLog },
    { icon: FileCheck, label: 'Save Template', onClick: onShowSaveAsTemplate },
    { icon: Users, label: 'Access', onClick: onShowAccessModal },
    ...(onShowDocTemplates
      ? [{ icon: FileText, label: 'Doc Templates', onClick: onShowDocTemplates }]
      : []),
    { icon: Columns, label: 'Columns', onClick: onShowColumnConfig },
  ]

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

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            <BoardPresenceIndicator presence={presence} isConnected={isConnected} />

            <Button variant="secondary" size="sm" onClick={onShowActivityLog}>
              <History className="w-4 h-4 mr-2" />
              Activity
            </Button>

            <Button variant="secondary" size="sm" onClick={onShowSaveAsTemplate}>
              <FileCheck className="w-4 h-4 mr-2" />
              Save Template
            </Button>

            <Button variant="secondary" size="sm" onClick={onShowAccessModal}>
              <Users className="w-4 h-4 mr-2" />
              Access
            </Button>

            {onShowDocTemplates && (
              <Button variant="secondary" size="sm" onClick={onShowDocTemplates}>
                <FileText className="w-4 h-4 mr-2" />
                Doc Templates
              </Button>
            )}

            <Button variant="secondary" size="sm" onClick={onShowColumnConfig}>
              <Columns className="w-4 h-4 mr-2" />
              Columns
            </Button>
          </div>

          {/* Mobile Actions - overflow menu */}
          <div className="flex md:hidden items-center gap-2 flex-shrink-0" ref={menuRef}>
            <BoardPresenceIndicator presence={presence} isConnected={isConnected} />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md hover:bg-bg-hover text-text-secondary"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {mobileMenuOpen && (
              <div className="absolute right-4 top-12 w-48 bg-bg-primary rounded-lg shadow-lg border border-border-light z-50 py-1">
                {menuItems.map(item => (
                  <button
                    key={item.label}
                    onClick={() => {
                      item.onClick()
                      setMobileMenuOpen(false)
                    }}
                    className="w-full px-4 py-2.5 text-sm text-left hover:bg-bg-hover flex items-center gap-3 text-text-primary"
                  >
                    <item.icon className="w-4 h-4 text-text-secondary" />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
