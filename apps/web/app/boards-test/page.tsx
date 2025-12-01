'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useBoardColumns, useBoardViews, useItemUpdates, useItemComments } from '@/hooks/board'
import { Button } from '@/components/ui-monday'
import type { BoardType } from '@/types/board'

export default function BoardsTestPage() {
  const { user } = useAuth()
  const [boardType, setBoardType] = useState<BoardType>('routes')
  const [testItemId, setTestItemId] = useState('')

  // Test hooks
  const { data: columns, isLoading: columnsLoading, error: columnsError } = useBoardColumns(boardType)
  const { data: views, isLoading: viewsLoading } = useBoardViews(boardType, user?.id || '')
  const { data: updates, isLoading: updatesLoading } = useItemUpdates('route', testItemId || '123')
  const { data: comments, isLoading: commentsLoading } = useItemComments('route', testItemId || '123')

  return (
    <div className="min-h-screen bg-bg-secondary p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-bg-primary border border-border-light rounded-lg p-6 shadow-monday-sm">
          <h1 className="text-h1 font-semibold text-text-primary mb-2">
            Boards System Test Page
          </h1>
          <p className="text-text-secondary">
            Testing board services, hooks, and database connectivity
          </p>
        </div>

        {/* User Info */}
        {user && (
          <div className="bg-bg-primary border border-border-light rounded-lg p-6 shadow-monday-sm">
            <h2 className="text-h3 font-semibold text-text-primary mb-4">
              Current User
            </h2>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium text-text-primary">Email:</span>{' '}
                <span className="text-text-secondary">{user.email}</span>
              </p>
              <p className="text-sm">
                <span className="font-medium text-text-primary">ID:</span>{' '}
                <span className="text-text-secondary font-mono text-xs">{user.id}</span>
              </p>
            </div>
          </div>
        )}

        {/* Board Type Selector */}
        <div className="bg-bg-primary border border-border-light rounded-lg p-6 shadow-monday-sm">
          <h2 className="text-h3 font-semibold text-text-primary mb-4">
            Select Board Type
          </h2>
          <div className="flex gap-3">
            {(['routes', 'companies', 'inspectors', 'inspections'] as BoardType[]).map((type) => (
              <Button
                key={type}
                variant={boardType === type ? 'primary' : 'secondary'}
                onClick={() => setBoardType(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Board Columns Test */}
        <div className="bg-bg-primary border border-border-light rounded-lg p-6 shadow-monday-sm">
          <h2 className="text-h3 font-semibold text-text-primary mb-4">
            Board Columns ({boardType})
          </h2>

          {columnsLoading && (
            <div className="flex items-center gap-2 text-text-secondary">
              <div className="w-4 h-4 border-2 border-monday-primary border-t-transparent rounded-full animate-spin" />
              Loading columns...
            </div>
          )}

          {columnsError && (
            <div className="p-4 bg-status-stuck/10 border border-status-stuck rounded-md">
              <p className="text-status-stuck font-medium">Error loading columns:</p>
              <p className="text-sm text-text-secondary mt-1">
                {columnsError instanceof Error ? columnsError.message : 'Unknown error'}
              </p>
            </div>
          )}

          {columns && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Found {columns.length} columns
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {columns.map((column) => (
                  <div
                    key={column.id}
                    className="p-4 border border-border-light rounded-md hover:border-monday-primary transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-text-primary">{column.column_name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        column.is_visible
                          ? 'bg-status-done/10 text-status-done'
                          : 'bg-status-default/10 text-status-default'
                      }`}>
                        {column.is_visible ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-text-secondary">
                      <p>Type: <span className="font-mono">{column.column_type}</span></p>
                      <p>Width: {column.width}px</p>
                      <p>Position: {column.position}</p>
                      {column.column_name_ka && (
                        <p className="font-georgian">Georgian: {column.column_name_ka}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Board Views Test */}
        <div className="bg-bg-primary border border-border-light rounded-lg p-6 shadow-monday-sm">
          <h2 className="text-h3 font-semibold text-text-primary mb-4">
            Saved Views ({boardType})
          </h2>

          {viewsLoading && (
            <div className="flex items-center gap-2 text-text-secondary">
              <div className="w-4 h-4 border-2 border-monday-primary border-t-transparent rounded-full animate-spin" />
              Loading views...
            </div>
          )}

          {views && (
            <div className="space-y-4">
              {views.length === 0 ? (
                <p className="text-text-secondary text-sm">
                  No saved views yet. Views will appear here once users create custom filters and sorts.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {views.map((view) => (
                    <div
                      key={view.id}
                      className="p-4 border border-border-light rounded-md"
                    >
                      <h3 className="font-medium text-text-primary">{view.view_name}</h3>
                      <div className="mt-2 space-y-1 text-xs text-text-secondary">
                        <p>Filters: {view.filters.length}</p>
                        <p>Default: {view.is_default ? 'Yes' : 'No'}</p>
                        <p>Shared: {view.is_shared ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Activity Test */}
        <div className="bg-bg-primary border border-border-light rounded-lg p-6 shadow-monday-sm">
          <h2 className="text-h3 font-semibold text-text-primary mb-4">
            Activity Feed Test
          </h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-text-primary mb-2">
              Test Item ID (for activity/comments):
            </label>
            <input
              type="text"
              value={testItemId}
              onChange={(e) => setTestItemId(e.target.value)}
              placeholder="Enter a route ID to test..."
              className="w-full px-3 py-2 border border-border-light rounded-md focus:ring-2 focus:ring-monday-primary focus:border-transparent"
            />
          </div>

          {updatesLoading && (
            <div className="flex items-center gap-2 text-text-secondary">
              <div className="w-4 h-4 border-2 border-monday-primary border-t-transparent rounded-full animate-spin" />
              Loading activity...
            </div>
          )}

          {updates && (
            <div className="space-y-2">
              <p className="text-sm text-text-secondary">
                Found {updates.length} activity items
              </p>
              {updates.length === 0 && testItemId && (
                <p className="text-xs text-text-tertiary">
                  No activity for this item yet
                </p>
              )}
            </div>
          )}
        </div>

        {/* Comments Test */}
        <div className="bg-bg-primary border border-border-light rounded-lg p-6 shadow-monday-sm">
          <h2 className="text-h3 font-semibold text-text-primary mb-4">
            Comments Test
          </h2>

          {commentsLoading && (
            <div className="flex items-center gap-2 text-text-secondary">
              <div className="w-4 h-4 border-2 border-monday-primary border-t-transparent rounded-full animate-spin" />
              Loading comments...
            </div>
          )}

          {comments && (
            <div className="space-y-2">
              <p className="text-sm text-text-secondary">
                Found {comments.length} comments
              </p>
              {comments.length === 0 && testItemId && (
                <p className="text-xs text-text-tertiary">
                  No comments for this item yet
                </p>
              )}
            </div>
          )}
        </div>

        {/* Status Summary */}
        <div className="bg-bg-primary border border-border-light rounded-lg p-6 shadow-monday-sm">
          <h2 className="text-h3 font-semibold text-text-primary mb-4">
            System Status
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${columnsError ? 'text-status-stuck' : 'text-status-done'}`}>
                {columnsError ? '✗' : '✓'}
              </div>
              <p className="text-sm text-text-secondary mt-1">Board Columns</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-status-done">✓</div>
              <p className="text-sm text-text-secondary mt-1">Board Views</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-status-done">✓</div>
              <p className="text-sm text-text-secondary mt-1">Activity Feed</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-status-done">✓</div>
              <p className="text-sm text-text-secondary mt-1">Comments</p>
            </div>
          </div>
        </div>

        {/* React Query DevTools Info */}
        <div className="bg-monday-primary/10 border border-monday-primary rounded-lg p-6">
          <h2 className="text-h4 font-semibold text-text-primary mb-2">
            💡 React Query DevTools
          </h2>
          <p className="text-sm text-text-secondary">
            Look for the React Query DevTools button in the bottom-right corner to inspect queries, mutations, and cache.
          </p>
        </div>
      </div>
    </div>
  )
}
