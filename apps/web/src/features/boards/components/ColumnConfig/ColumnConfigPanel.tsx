'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { X, Eye, EyeOff, GripVertical, Plus, Trash2, Settings as SettingsIcon } from 'lucide-react'
import type { BoardColumn } from '@/types/board'

interface ColumnConfigPanelProps {
  columns: BoardColumn[]
  onClose: () => void
  onUpdateColumn: (columnId: string, updates: Partial<BoardColumn>) => void
  onReorderColumns: (columns: BoardColumn[]) => void
  onAddColumn: () => void
  onDeleteColumn: (columnId: string) => void
}

export function ColumnConfigPanel({
  columns,
  onClose,
  onUpdateColumn,
  onReorderColumns,
  onAddColumn,
  onDeleteColumn,
}: ColumnConfigPanelProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newColumns = [...columns]
    const draggedColumn = newColumns[draggedIndex]
    newColumns.splice(draggedIndex, 1)
    newColumns.splice(index, 0, draggedColumn)

    onReorderColumns(newColumns)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const toggleVisibility = (column: BoardColumn) => {
    onUpdateColumn(column.id, { is_visible: !column.is_visible })
  }

  const handleWidthChange = (column: BoardColumn, newWidth: number) => {
    onUpdateColumn(column.id, { width: Math.max(80, Math.min(500, newWidth)) })
  }

  const getColumnTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      text: 'Text',
      number: 'Number',
      status: 'Status',
      date: 'Date',
      person: 'Person',
      checkbox: 'Checkbox',
      dropdown: 'Dropdown',
      link: 'Link',
    }
    return typeMap[type] || type
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative ml-auto w-[400px] bg-bg-primary shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-monday-primary" />
            <h2 className="text-lg font-semibold text-text-primary">Column Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-bg-hover transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Column List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {columns.map((column, index) => (
              <div
                key={column.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'bg-bg-secondary rounded-lg border border-border-light p-3',
                  'transition-all duration-200',
                  draggedIndex === index && 'opacity-50 scale-95',
                  'hover:border-monday-primary hover:shadow-sm'
                )}
              >
                <div className="flex items-center gap-2">
                  {/* Drag Handle */}
                  <button className="cursor-grab active:cursor-grabbing text-text-tertiary hover:text-text-primary">
                    <GripVertical className="w-4 h-4" />
                  </button>

                  {/* Column Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-text-primary truncate">
                        {column.column_name}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-bg-tertiary text-text-tertiary">
                        {getColumnTypeLabel(column.column_type)}
                      </span>
                    </div>

                    {/* Width Control */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-tertiary">Width:</span>
                      <input
                        type="range"
                        min="80"
                        max="500"
                        step="10"
                        value={column.width}
                        onChange={(e) => handleWidthChange(column, parseInt(e.target.value))}
                        className="flex-1 h-1 bg-bg-tertiary rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #0073ea 0%, #0073ea ${((column.width - 80) / (500 - 80)) * 100}%, #e6e9ef ${((column.width - 80) / (500 - 80)) * 100}%, #e6e9ef 100%)`
                        }}
                      />
                      <span className="text-xs text-text-secondary w-10 text-right">
                        {column.width}px
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleVisibility(column)}
                      className="p-1.5 rounded hover:bg-bg-hover transition-colors"
                      title={column.is_visible ? 'Hide column' : 'Show column'}
                    >
                      {column.is_visible ? (
                        <Eye className="w-4 h-4 text-monday-primary" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-text-tertiary" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete column "${column.column_name}"?`)) {
                          onDeleteColumn(column.id)
                        }
                      }}
                      className="p-1.5 rounded hover:bg-red-50 transition-colors"
                      title="Delete column"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-light">
          <button
            onClick={onAddColumn}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-monday-primary text-white rounded-md hover:bg-monday-primary-hover transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Add Column</span>
          </button>
        </div>
      </div>
    </div>
  )
}
