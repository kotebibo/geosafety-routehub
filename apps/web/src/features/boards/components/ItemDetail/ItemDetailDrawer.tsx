'use client'

import React, { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  X,
  MessageSquare,
  Activity,
  User as UserIcon,
  Send,
  Paperclip,
  Trash2,
  Reply,
  FileText,
  Image as ImageIcon,
  Download,
  ExternalLink,
} from 'lucide-react'
import type { BoardItem, BoardColumn, ItemComment } from '@/types/board'
import { CellRenderer } from '../BoardTable/CellRenderer'
import { ActivityTab } from './ActivityTab'
import {
  useItemUpdates,
  useItemComments,
  useCreateComment,
  useDeleteComment,
  useItemUpdatesSubscription,
  useItemCommentsSubscription,
} from '../../hooks/useActivity'
import { useAuth } from '@/contexts/AuthContext'
import { useInspectorId } from '@/hooks/useInspectorId'

interface ItemDetailDrawerProps {
  item: BoardItem
  columns: BoardColumn[]
  onClose: () => void
  onUpdate: (itemId: string, updates: Partial<BoardItem>) => void
}

// Format relative time for comments
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

// Get file icon based on file type
function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
    return <ImageIcon className="w-4 h-4 text-green-600" />
  }
  return <FileText className="w-4 h-4 text-blue-600" />
}

// Check if file is an image
function isImageFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')
}

export function ItemDetailDrawer({ item, columns, onClose, onUpdate }: ItemDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'comments' | 'files'>('details')
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const commentInputRef = useRef<HTMLTextAreaElement>(null)

  const { user } = useAuth()
  const { data: inspectorId } = useInspectorId(user?.email)

  // Fetch activity and comments
  const { data: updates = [], isLoading: updatesLoading } = useItemUpdates('board_item', item.id)
  const { data: comments = [], isLoading: commentsLoading } = useItemComments('board_item', item.id)

  // Real-time subscriptions
  useItemUpdatesSubscription('board_item', item.id)
  useItemCommentsSubscription('board_item', item.id)

  // Mutations
  const createComment = useCreateComment()
  const deleteComment = useDeleteComment('board_item', item.id)

  // Get files from item data
  const filesColumn = columns.find(col => col.column_type === 'files')
  const files: Array<{ name: string; url: string; type: string; size?: number }> =
    filesColumn ? (item.data?.[filesColumn.column_id] || []) : []

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

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !inspectorId) return

    try {
      await createComment.mutateAsync({
        item_type: 'board_item',
        item_id: item.id,
        user_id: inspectorId,
        content: newComment.trim(),
      })
      setNewComment('')
    } catch (error) {
      console.error('Failed to create comment:', error)
    }
  }

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!replyContent.trim() || !inspectorId) return

    try {
      await createComment.mutateAsync({
        item_type: 'board_item',
        item_id: item.id,
        user_id: inspectorId,
        content: replyContent.trim(),
        parent_comment_id: parentCommentId,
      })
      setReplyContent('')
      setReplyingTo(null)
    } catch (error) {
      console.error('Failed to create reply:', error)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return
    try {
      await deleteComment.mutateAsync(commentId)
    } catch (error) {
      console.error('Failed to delete comment:', error)
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
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-[650px] bg-bg-primary shadow-2xl z-50 flex flex-col">
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
        <div className="flex items-center gap-1 px-6 py-3 border-b border-border-light overflow-x-auto">
          <button
            onClick={() => setActiveTab('details')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
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
              'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap',
              activeTab === 'activity'
                ? 'bg-monday-primary text-white'
                : 'text-text-secondary hover:bg-bg-hover'
            )}
          >
            <Activity className="w-4 h-4" />
            Activity
            {updates.length > 0 && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                activeTab === 'activity' ? 'bg-white/20' : 'bg-bg-tertiary'
              )}>
                {updates.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap',
              activeTab === 'comments'
                ? 'bg-monday-primary text-white'
                : 'text-text-secondary hover:bg-bg-hover'
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Comments
            {comments.length > 0 && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                activeTab === 'comments' ? 'bg-white/20' : 'bg-bg-tertiary'
              )}>
                {comments.length}
              </span>
            )}
          </button>
          {files.length > 0 && (
            <button
              onClick={() => setActiveTab('files')}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap',
                activeTab === 'files'
                  ? 'bg-monday-primary text-white'
                  : 'text-text-secondary hover:bg-bg-hover'
              )}
            >
              <Paperclip className="w-4 h-4" />
              Files
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                activeTab === 'files' ? 'bg-white/20' : 'bg-bg-tertiary'
              )}>
                {files.length}
              </span>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Details Tab */}
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
                        onEdit={(newValue) => handleCellEdit(column.column_id, newValue)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <ActivityTab
              updates={updates}
              isLoading={updatesLoading}
              itemCreatedAt={item.created_at}
            />
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              {/* Comment Input */}
              <div className="bg-bg-secondary rounded-lg border border-border-light p-3">
                <textarea
                  ref={commentInputRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className={cn(
                    'w-full min-h-[80px] bg-transparent resize-none',
                    'text-sm text-text-primary placeholder-text-tertiary',
                    'focus:outline-none'
                  )}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      handleSubmitComment()
                    }
                  }}
                />
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-light">
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 rounded hover:bg-bg-hover text-text-tertiary hover:text-text-secondary">
                      <Paperclip className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || createComment.isPending}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2',
                      newComment.trim()
                        ? 'bg-monday-primary text-white hover:bg-monday-primary-hover'
                        : 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
                    )}
                  >
                    <Send className="w-4 h-4" />
                    {createComment.isPending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>

              {/* Comments List */}
              {commentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-monday-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="bg-bg-secondary rounded-lg p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
                  <p className="text-sm text-text-secondary">No comments yet</p>
                  <p className="text-xs text-text-tertiary mt-1">
                    Be the first to comment on this item
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-bg-secondary rounded-lg border border-border-light">
                      {/* Comment Header */}
                      <div className="flex items-start gap-3 p-4">
                        <div className="w-8 h-8 rounded-full bg-monday-primary flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-medium">
                            {(comment.user_name || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-text-primary text-sm">
                                {comment.user_name || 'Unknown User'}
                              </span>
                              <span className="text-xs text-text-tertiary">
                                {formatRelativeTime(comment.created_at)}
                              </span>
                              {comment.is_edited && (
                                <span className="text-xs text-text-tertiary italic">(edited)</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                className="p-1 rounded hover:bg-bg-hover text-text-tertiary hover:text-text-secondary"
                                title="Reply"
                              >
                                <Reply className="w-4 h-4" />
                              </button>
                              {comment.user_id === inspectorId && (
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="p-1 rounded hover:bg-bg-hover text-text-tertiary hover:text-red-500"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-text-primary mt-2 whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        </div>
                      </div>

                      {/* Reply Input */}
                      {replyingTo === comment.id && (
                        <div className="px-4 pb-4 pl-14">
                          <div className="bg-bg-primary rounded-lg border border-border-light p-2">
                            <textarea
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              placeholder="Write a reply..."
                              className="w-full min-h-[60px] bg-transparent resize-none text-sm focus:outline-none"
                              autoFocus
                            />
                            <div className="flex items-center justify-end gap-2 mt-2">
                              <button
                                onClick={() => {
                                  setReplyingTo(null)
                                  setReplyContent('')
                                }}
                                className="px-3 py-1 text-sm text-text-secondary hover:bg-bg-hover rounded"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSubmitReply(comment.id)}
                                disabled={!replyContent.trim()}
                                className={cn(
                                  'px-3 py-1 rounded text-sm font-medium',
                                  replyContent.trim()
                                    ? 'bg-monday-primary text-white'
                                    : 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
                                )}
                              >
                                Reply
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="border-t border-border-light bg-bg-primary/50">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex items-start gap-3 p-4 pl-14">
                              <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs font-medium">
                                  {(reply.user_name || 'U').charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-text-primary text-sm">
                                    {reply.user_name || 'Unknown User'}
                                  </span>
                                  <span className="text-xs text-text-tertiary">
                                    {formatRelativeTime(reply.created_at)}
                                  </span>
                                </div>
                                <p className="text-sm text-text-primary mt-1 whitespace-pre-wrap">
                                  {reply.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <div className="space-y-4">
              {files.length === 0 ? (
                <div className="bg-bg-secondary rounded-lg p-8 text-center">
                  <Paperclip className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
                  <p className="text-sm text-text-secondary">No files attached</p>
                </div>
              ) : (
                <>
                  {/* Image Gallery */}
                  {files.filter(f => isImageFile(f.name)).length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-text-secondary mb-3">Images</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {files.filter(f => isImageFile(f.name)).map((file, index) => (
                          <div
                            key={index}
                            className="relative group rounded-lg overflow-hidden border border-border-light bg-bg-secondary"
                          >
                            <img
                              src={file.url}
                              alt={file.name}
                              className="w-full h-32 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-white rounded-full hover:bg-gray-100"
                                title="Open in new tab"
                              >
                                <ExternalLink className="w-4 h-4 text-gray-700" />
                              </a>
                              <a
                                href={file.url}
                                download={file.name}
                                className="p-2 bg-white rounded-full hover:bg-gray-100"
                                title="Download"
                              >
                                <Download className="w-4 h-4 text-gray-700" />
                              </a>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                              <p className="text-xs text-white truncate">{file.name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Document List */}
                  {files.filter(f => !isImageFile(f.name)).length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-text-secondary mb-3">Documents</h3>
                      <div className="space-y-2">
                        {files.filter(f => !isImageFile(f.name)).map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg border border-border-light hover:border-monday-primary/50 transition-colors"
                          >
                            {getFileIcon(file.name)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-text-primary truncate">{file.name}</p>
                              {file.size && (
                                <p className="text-xs text-text-tertiary">
                                  {(file.size / 1024).toFixed(1)} KB
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded hover:bg-bg-hover text-text-tertiary hover:text-text-secondary"
                                title="Open"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <a
                                href={file.url}
                                download={file.name}
                                className="p-1.5 rounded hover:bg-bg-hover text-text-tertiary hover:text-text-secondary"
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
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
