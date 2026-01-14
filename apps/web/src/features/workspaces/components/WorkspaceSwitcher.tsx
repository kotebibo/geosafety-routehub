'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  ChevronDown,
  Plus,
  Settings,
  Check,
  Folder,
  Home,
} from 'lucide-react'
import { useWorkspaces } from '../hooks/useWorkspaces'
import type { Workspace } from '@/types/workspace'

interface WorkspaceSwitcherProps {
  currentWorkspaceId?: string | null
  onWorkspaceChange: (workspaceId: string) => void
  onCreateClick: () => void
  collapsed?: boolean
}

// Workspace color mapping
const WORKSPACE_COLORS: Record<string, string> = {
  blue: 'bg-monday-primary',
  green: 'bg-status-done',
  red: 'bg-status-stuck',
  yellow: 'bg-status-working',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
}

// Workspace icon mapping
const WORKSPACE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  folder: Folder,
  home: Home,
}

export function WorkspaceSwitcher({
  currentWorkspaceId,
  onWorkspaceChange,
  onCreateClick,
  collapsed = false,
}: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const { data: workspaces, isLoading } = useWorkspaces()

  const currentWorkspace = React.useMemo(() => {
    if (!workspaces || !currentWorkspaceId) return null
    return workspaces.find((w) => w.id === currentWorkspaceId)
  }, [workspaces, currentWorkspaceId])

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const getWorkspaceColor = (color?: string) => {
    return WORKSPACE_COLORS[color || 'blue'] || WORKSPACE_COLORS.blue
  }

  const getWorkspaceIcon = (icon?: string) => {
    return WORKSPACE_ICONS[icon || 'folder'] || Folder
  }

  const handleSelect = (workspace: Workspace) => {
    onWorkspaceChange(workspace.id)
    setIsOpen(false)
  }

  if (collapsed) {
    return (
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-center p-2.5 rounded-md transition-all duration-fast',
          'hover:bg-bg-hover text-text-primary'
        )}
        title={currentWorkspace?.name || 'Select Workspace'}
      >
        <Folder className="w-5 h-5" />
      </button>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-fast w-full',
          'hover:bg-bg-hover',
          isOpen ? 'bg-bg-selected' : 'text-text-primary'
        )}
      >
        {currentWorkspace ? (
          <>
            <div
              className={cn(
                'w-5 h-5 rounded flex items-center justify-center text-white text-xs font-semibold flex-shrink-0',
                getWorkspaceColor(currentWorkspace.color)
              )}
            >
              {currentWorkspace.name.charAt(0).toUpperCase()}
            </div>
            <span className="flex-1 text-left truncate">{currentWorkspace.name}</span>
          </>
        ) : isLoading ? (
          <>
            <div className="w-5 h-5 rounded bg-gray-200 animate-pulse flex-shrink-0" />
            <span className="flex-1 text-left text-text-tertiary">Loading...</span>
          </>
        ) : (
          <>
            <Folder className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-left truncate">Select Workspace</span>
          </>
        )}
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform flex-shrink-0',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-lg border border-gray-200 shadow-lg py-1 max-h-[300px] overflow-y-auto">
          {/* Workspace List */}
          {workspaces && workspaces.length > 0 ? (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                Workspaces
              </div>
              {workspaces.map((workspace) => {
                const Icon = getWorkspaceIcon(workspace.icon)
                const isSelected = workspace.id === currentWorkspaceId

                return (
                  <button
                    key={workspace.id}
                    onClick={() => handleSelect(workspace)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                      isSelected
                        ? 'bg-bg-selected text-monday-primary'
                        : 'text-text-primary hover:bg-gray-50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded flex items-center justify-center text-white text-xs font-semibold flex-shrink-0',
                        getWorkspaceColor(workspace.color)
                      )}
                    >
                      {workspace.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 text-left truncate">{workspace.name}</span>
                    {workspace.is_default && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-text-tertiary rounded">
                        Default
                      </span>
                    )}
                    {isSelected && (
                      <Check className="w-4 h-4 text-monday-primary flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </>
          ) : (
            <div className="px-3 py-4 text-sm text-text-tertiary text-center">
              No workspaces found
            </div>
          )}

          <div className="my-1 border-t border-gray-100" />

          {/* Create Workspace */}
          <button
            onClick={() => {
              setIsOpen(false)
              onCreateClick()
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-4 h-4 text-text-tertiary flex-shrink-0" />
            <span>Create Workspace</span>
          </button>

          {/* Workspace Settings */}
          {currentWorkspace && (
            <Link
              href={`/workspaces/${currentWorkspace.id}/settings`}
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4 text-text-tertiary flex-shrink-0" />
              <span>Workspace Settings</span>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
