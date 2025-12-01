'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { X, MessageSquare, Activity, Clock, User as UserIcon } from 'lucide-react'
import type { BoardItem, BoardColumn } from '@/types/board'
import { CellRenderer } from '../BoardTable/CellRenderer'

interface ItemDetailDrawerProps {
  item: BoardItem
  columns: BoardColumn[]
  onClose: () => void
  onUpdate: (itemId: string, updates: Partial<BoardItem>) => void
}

export function ItemDetailDrawer({ item, columns, onClose, onUpdate }: ItemDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'comments'>('details')

  const handleCellEdit = async (columnId: string, value: any) => {
    try {
      await onUpdate(item.id, {
        data: {
          ...item.data,
          [columnId]: value,
        },
      })
    } catch (error) {
      console.error('Failed to update item:', error)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-[600px] bg-bg-primary shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <div className="flex-1">
            <input
              type="text"
              value={item.name}
              onChange={(e) => onUpdate(item.id, { name: e.target.value })}
              className={cn(
                'text-xl font-semibold text-text-primary',
                'bg-transparent border-none focus:outline-none',
                'w-full'
              )}
            />
            <p className="text-sm text-text-tertiary mt-1">
              Created {new Date(item.created_at).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-bg-hover transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-border-light">
          <button
            onClick={() => setActiveTab('details')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === 'details'
                ? 'bg-monday-primary text-white'
                : 'text-text-secondary hover:bg-bg-hover'
            )}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
              activeTab === 'activity'
                ? 'bg-monday-primary text-white'
                : 'text-text-secondary hover:bg-bg-hover'
            )}
          >
            <Activity className="w-4 h-4" />
            Activity
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
              activeTab === 'comments'
                ? 'bg-monday-primary text-white'
                : 'text-text-secondary hover:bg-bg-hover'
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Comments
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-4">
              {columns.filter(col => col.is_visible).map((column) => {
                const value = column.column_id === 'name' ? item.name : item.data?.[column.column_id]

                return (
                  <div key={column.id} className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">
                      {column.column_name}
                    </label>
                    <div className="bg-bg-secondary rounded-md border border-border-light min-h-[40px]">
                      <CellRenderer
                        row={item}
                        column={column}
                        value={value}
                        isEditing={false}
                        onEdit={(newValue) => handleCellEdit(column.column_id, newValue)}
                        onCancel={() => {}}
                        onSave={async () => {}}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-bg-secondary rounded-lg">
                <div className="w-8 h-8 rounded-full bg-monday-primary flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-text-primary">
                    <span className="font-medium">Item created</span>
                  </p>
                  <p className="text-xs text-text-tertiary mt-1">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {item.updated_at !== item.created_at && (
                <div className="flex items-start gap-3 p-4 bg-bg-secondary rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <Activity className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-text-primary">
                      <span className="font-medium">Item updated</span>
                    </p>
                    <p className="text-xs text-text-tertiary mt-1">
                      {new Date(item.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              <p className="text-sm text-text-tertiary text-center py-8">
                Detailed activity tracking coming soon...
              </p>
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-4">
              <div className="bg-bg-secondary rounded-lg p-8 text-center">
                <MessageSquare className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
                <p className="text-sm text-text-secondary">
                  No comments yet
                </p>
                <p className="text-xs text-text-tertiary mt-1">
                  Comments feature coming soon...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-light flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-text-tertiary">
            <UserIcon className="w-4 h-4" />
            <span>Created by {item.created_by || 'Unknown'}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-monday-primary text-white rounded-md hover:bg-monday-primary-hover transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  )
}
