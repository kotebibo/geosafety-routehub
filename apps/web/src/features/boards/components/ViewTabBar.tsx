'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Table,
  LayoutGrid,
  Calendar,
  BarChart3,
  GanttChart,
  Plus,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  X,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BoardViewTab, ViewType } from '../types/board'

const VIEW_TYPE_ICONS: Record<ViewType, typeof Table> = {
  table: Table,
  kanban: LayoutGrid,
  calendar: Calendar,
  chart: BarChart3,
  timeline: GanttChart,
}

const VIEW_TYPE_LABELS: Record<ViewType, string> = {
  table: 'Table',
  kanban: 'Kanban',
  calendar: 'Calendar',
  chart: 'Chart',
  timeline: 'Timeline',
}

interface ViewTabBarProps {
  tabs: BoardViewTab[]
  activeTabId: string | null
  onTabChange: (tabId: string) => void
  onCreateTab: (viewType: ViewType, name: string) => void
  onDeleteTab: (tabId: string) => void
  onRenameTab: (tabId: string, name: string) => void
  onDuplicateTab: (tabId: string) => void
}

export function ViewTabBar({
  tabs,
  activeTabId,
  onTabChange,
  onCreateTab,
  onDeleteTab,
  onRenameTab,
  onDuplicateTab,
}: ViewTabBarProps) {
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(
    null
  )
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)
  const addMenuRef = useRef<HTMLDivElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  // Close menus on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false)
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Focus edit input
  useEffect(() => {
    if (editingTabId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingTabId])

  const handleStartRename = useCallback(
    (tabId: string) => {
      const tab = tabs.find(t => t.id === tabId)
      if (tab) {
        setEditingTabId(tabId)
        setEditingName(tab.view_name)
        setContextMenu(null)
      }
    },
    [tabs]
  )

  const handleFinishRename = useCallback(() => {
    if (editingTabId && editingName.trim()) {
      onRenameTab(editingTabId, editingName.trim())
    }
    setEditingTabId(null)
    setEditingName('')
  }, [editingTabId, editingName, onRenameTab])

  const handleContextMenu = useCallback((e: React.MouseEvent, tabId: string) => {
    e.preventDefault()
    setContextMenu({ tabId, x: e.clientX, y: e.clientY })
  }, [])

  return (
    <div className="flex items-center gap-1 px-4 md:px-6 py-1.5 bg-bg-primary border-b border-border-light overflow-x-auto">
      {tabs.map(tab => {
        const Icon = VIEW_TYPE_ICONS[tab.view_type] || Table
        const isActive = tab.id === activeTabId

        return (
          <div key={tab.id} className="flex items-center group relative">
            {editingTabId === tab.id ? (
              <div className="flex items-center gap-1 px-2 py-1">
                <Icon className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                <input
                  ref={editInputRef}
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onBlur={handleFinishRename}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleFinishRename()
                    if (e.key === 'Escape') {
                      setEditingTabId(null)
                      setEditingName('')
                    }
                  }}
                  className="w-24 text-xs font-medium bg-bg-primary border border-monday-primary rounded px-1 py-0.5 focus:outline-none"
                />
                <button onClick={handleFinishRename} className="p-0.5 hover:bg-bg-hover rounded">
                  <Check className="w-3 h-3 text-status-done" />
                </button>
                <button
                  onClick={() => {
                    setEditingTabId(null)
                    setEditingName('')
                  }}
                  className="p-0.5 hover:bg-bg-hover rounded"
                >
                  <X className="w-3 h-3 text-text-tertiary" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onTabChange(tab.id)}
                onContextMenu={e => handleContextMenu(e, tab.id)}
                onDoubleClick={() => !tab.is_default && handleStartRename(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-monday-primary text-white'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.view_name}</span>
                {!tab.is_default && (
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      handleContextMenu(e, tab.id)
                    }}
                    className={cn(
                      'p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity',
                      isActive ? 'hover:bg-white/20' : 'hover:bg-bg-hover'
                    )}
                  >
                    <MoreHorizontal className="w-3 h-3" />
                  </button>
                )}
              </button>
            )}
          </div>
        )
      })}

      {/* Add View Tab */}
      <div className="relative" ref={addMenuRef}>
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="flex items-center gap-1 px-2 py-1.5 text-xs text-text-tertiary hover:text-text-secondary hover:bg-bg-hover rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        {showAddMenu && (
          <div className="absolute left-0 top-full mt-1 w-48 bg-bg-primary rounded-lg shadow-lg border border-border-light z-50 py-1">
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase text-text-tertiary tracking-wide">
              Add View
            </div>
            {(Object.keys(VIEW_TYPE_LABELS) as ViewType[]).map(viewType => {
              const Icon = VIEW_TYPE_ICONS[viewType]
              return (
                <button
                  key={viewType}
                  onClick={() => {
                    onCreateTab(viewType, VIEW_TYPE_LABELS[viewType])
                    setShowAddMenu(false)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
                >
                  <Icon className="w-4 h-4 text-text-tertiary" />
                  {VIEW_TYPE_LABELS[viewType]}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setContextMenu(null)} />
          <div
            ref={contextMenuRef}
            className="fixed z-[9999] w-44 bg-bg-primary rounded-lg shadow-lg border border-border-light py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => handleStartRename(contextMenu.tabId)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-text-tertiary" />
              Rename
            </button>
            <button
              onClick={() => {
                onDuplicateTab(contextMenu.tabId)
                setContextMenu(null)
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-text-tertiary" />
              Duplicate
            </button>
            <div className="my-1 border-t border-border-light" />
            <button
              onClick={() => {
                onDeleteTab(contextMenu.tabId)
                setContextMenu(null)
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}
