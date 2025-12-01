'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { X, Type, Hash, Calendar, CheckSquare, User, Link as LinkIcon, List } from 'lucide-react'
import type { ColumnType } from '@/types/board'

interface AddColumnModalProps {
  onClose: () => void
  onAdd: (column: { column_name: string; column_type: ColumnType; width: number }) => void
}

const COLUMN_TYPES: Array<{
  type: ColumnType
  label: string
  icon: React.ReactNode
  description: string
}> = [
  {
    type: 'text',
    label: 'Text',
    icon: <Type className="w-5 h-5" />,
    description: 'Single or multi-line text',
  },
  {
    type: 'number',
    label: 'Number',
    icon: <Hash className="w-5 h-5" />,
    description: 'Numeric values',
  },
  {
    type: 'status',
    label: 'Status',
    icon: <CheckSquare className="w-5 h-5" />,
    description: 'Colored status labels',
  },
  {
    type: 'date',
    label: 'Date',
    icon: <Calendar className="w-5 h-5" />,
    description: 'Date picker',
  },
  {
    type: 'person',
    label: 'Person',
    icon: <User className="w-5 h-5" />,
    description: 'Assign people',
  },
]

export function AddColumnModal({ onClose, onAdd }: AddColumnModalProps) {
  const [columnName, setColumnName] = useState('')
  const [selectedType, setSelectedType] = useState<ColumnType>('text')
  const [width, setWidth] = useState(180)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!columnName.trim()) return

    onAdd({
      column_name: columnName.trim(),
      column_type: selectedType,
      width,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-bg-primary rounded-lg shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <h2 className="text-lg font-semibold text-text-primary">Add New Column</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-bg-hover transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Column Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-2">
              Column Name
            </label>
            <input
              type="text"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              placeholder="e.g., Priority, Owner, Due Date"
              className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:border-monday-primary"
              autoFocus
            />
          </div>

          {/* Column Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-3">
              Column Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {COLUMN_TYPES.map((type) => (
                <button
                  key={type.type}
                  type="button"
                  onClick={() => setSelectedType(type.type)}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border-2 transition-all',
                    'hover:border-monday-primary/50',
                    selectedType === type.type
                      ? 'border-monday-primary bg-blue-50'
                      : 'border-border-light bg-bg-secondary'
                  )}
                >
                  <div
                    className={cn(
                      'flex-shrink-0 mt-0.5',
                      selectedType === type.type
                        ? 'text-monday-primary'
                        : 'text-text-tertiary'
                    )}
                  >
                    {type.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div
                      className={cn(
                        'font-medium mb-0.5',
                        selectedType === type.type
                          ? 'text-monday-primary'
                          : 'text-text-primary'
                      )}
                    >
                      {type.label}
                    </div>
                    <div className="text-xs text-text-tertiary">
                      {type.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Column Width */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-2">
              Column Width: {width}px
            </label>
            <input
              type="range"
              min="80"
              max="500"
              step="10"
              value={width}
              onChange={(e) => setWidth(parseInt(e.target.value))}
              className="w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #0073ea 0%, #0073ea ${((width - 80) / (500 - 80)) * 100}%, #e6e9ef ${((width - 80) / (500 - 80)) * 100}%, #e6e9ef 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-text-tertiary mt-1">
              <span>80px (narrow)</span>
              <span>500px (wide)</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-light">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:bg-bg-hover rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!columnName.trim()}
              className={cn(
                'px-4 py-2 bg-monday-primary text-white rounded-md transition-colors',
                columnName.trim()
                  ? 'hover:bg-monday-primary-hover'
                  : 'opacity-50 cursor-not-allowed'
              )}
            >
              Add Column
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
