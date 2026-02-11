'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { MessageSquare, Send, X, Clock, User, Reply, CornerDownRight, AtSign, Trash2, Edit2, Check, History, ArrowRightLeft, UserCheck, FileEdit, PlusCircle } from 'lucide-react'
import { activityService } from '@/features/boards/services/activity.service'
import { useAuth } from '@/contexts/AuthContext'
import { useInspectorId } from '@/hooks/useInspectorId'
import { useInspectors } from '@/hooks/useInspectors'
import type { ItemComment, ItemUpdate } from '@/types/board'

interface UpdatesModalProps {
  isOpen: boolean
  onClose: () => void
  itemId: string
  itemName?: string
  itemType?: string
  onCommentCountChange?: (count: number) => void
}

interface MentionSuggestion {
  id: string
  name: string
  email?: string
}

export function UpdatesModal({
  isOpen,
  onClose,
  itemId,
  itemName = 'Item',
  itemType = 'board_item',
  onCommentCountChange,
}: UpdatesModalProps) {
  const { user } = useAuth()
  const { data: inspectorId } = useInspectorId(user?.email ?? undefined)
  const { inspectors } = useInspectors()

  const [activeTab, setActiveTab] = useState<'updates' | 'activity'>('updates')
  const [comments, setComments] = useState<ItemComment[]>([])
  const [activities, setActivities] = useState<ItemUpdate[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [activityLoading, setActivityLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<ItemComment | null>(null)
  const [editingComment, setEditingComment] = useState<ItemComment | null>(null)
  const [editContent, setEditContent] = useState('')

  // Mention state
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [selectedMentions, setSelectedMentions] = useState<string[]>([])

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const mentionListRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Filter inspectors for mention suggestions
  const mentionSuggestions: MentionSuggestion[] = inspectors
    ?.filter((inspector) => {
      const name = (inspector.full_name || '').toLowerCase()
      const email = (inspector.email || '').toLowerCase()
      const search = mentionSearch.toLowerCase()
      return name.includes(search) || email.includes(search)
    })
    .map((inspector) => ({
      id: inspector.id,
      name: inspector.full_name || 'Unknown',
      email: inspector.email,
    }))
    .slice(0, 5) || []

  // Load data when modal opens or tab changes
  useEffect(() => {
    if (isOpen && itemId) {
      if (activeTab === 'updates') {
        loadComments()
      } else {
        loadActivity()
      }
    }
  }, [isOpen, itemId, activeTab])

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const loadComments = async () => {
    if (!itemId) return
    setLoading(true)
    try {
      const data = await activityService.getComments(itemType, itemId)
      setComments(data)
      onCommentCountChange?.(data.length)
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadActivity = async () => {
    if (!itemId) return
    setActivityLoading(true)
    try {
      const data = await activityService.getItemUpdates(itemType, itemId)
      setActivities(data)
    } catch (error) {
      console.error('Error loading activity:', error)
    } finally {
      setActivityLoading(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'created': return <PlusCircle className="w-4 h-4 text-[#00c875]" />
      case 'updated': return <FileEdit className="w-4 h-4 text-[#0073ea]" />
      case 'status_changed': return <ArrowRightLeft className="w-4 h-4 text-[#fdab3d]" />
      case 'assigned':
      case 'reassigned': return <UserCheck className="w-4 h-4 text-[#a25ddc]" />
      case 'comment': return <MessageSquare className="w-4 h-4 text-[#579bfc]" />
      default: return <History className="w-4 h-4 text-[#676879]" />
    }
  }

  const getActivityDescription = (update: ItemUpdate) => {
    const fieldName = update.metadata?.displayName || update.column_name || update.field_name || 'field'
    switch (update.update_type) {
      case 'created': return 'created this item'
      case 'status_changed': return `changed ${fieldName} from "${update.old_value || '-'}" to "${update.new_value || '-'}"`
      case 'assigned': return update.content || `assigned ${fieldName}`
      case 'reassigned': return update.content || `reassigned ${fieldName}`
      case 'comment': return `commented: "${update.content?.substring(0, 60) || ''}${(update.content?.length || 0) > 60 ? '...' : ''}"`
      case 'updated':
        if (update.old_value && update.new_value) {
          return `changed ${fieldName} from "${update.old_value}" to "${update.new_value}"`
        }
        if (update.new_value) {
          return `set ${fieldName} to "${update.new_value}"`
        }
        return `updated ${fieldName}`
      default: return update.content || `updated ${fieldName}`
    }
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !itemId || submitting || !inspectorId) return

    setSubmitting(true)
    try {
      await activityService.createComment({
        item_type: itemType,
        item_id: itemId,
        user_id: inspectorId,
        content: newComment.trim(),
        parent_comment_id: replyingTo?.id,
        mentions: selectedMentions,
      })
      setNewComment('')
      setReplyingTo(null)
      setSelectedMentions([])
      await loadComments()
    } catch (error) {
      console.error('Error creating comment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditComment = async (comment: ItemComment) => {
    if (!editContent.trim() || submitting) return

    setSubmitting(true)
    try {
      await activityService.updateComment(comment.id, editContent.trim())
      setEditingComment(null)
      setEditContent('')
      await loadComments()
    } catch (error) {
      console.error('Error updating comment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      await activityService.deleteComment(commentId)
      await loadComments()
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  // Handle text input changes for @mention detection
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const position = e.target.selectionStart || 0
    setNewComment(value)
    setCursorPosition(position)

    // Check for @ mention trigger
    const textBeforeCursor = value.slice(0, position)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)

    if (mentionMatch) {
      setShowMentions(true)
      setMentionSearch(mentionMatch[1])
      setMentionIndex(0)
    } else {
      setShowMentions(false)
      setMentionSearch('')
    }
  }

  // Insert mention into text
  const insertMention = useCallback((suggestion: MentionSuggestion) => {
    const textBeforeCursor = newComment.slice(0, cursorPosition)
    const textAfterCursor = newComment.slice(cursorPosition)

    // Find and replace the @mention trigger
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.slice(0, mentionMatch.index)
      const newText = `${beforeMention}@${suggestion.name} ${textAfterCursor}`
      setNewComment(newText)
      setSelectedMentions([...selectedMentions, suggestion.id])
    }

    setShowMentions(false)
    setMentionSearch('')
    inputRef.current?.focus()
  }, [newComment, cursorPosition, selectedMentions])

  // Handle keyboard navigation in mention list
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && mentionSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex((prev) => (prev + 1) % mentionSuggestions.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex((prev) => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length)
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(mentionSuggestions[mentionIndex])
      } else if (e.key === 'Escape') {
        setShowMentions(false)
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitComment()
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getInitials = (name: string) => {
    const parts = name.split(' ')
    return parts.map((p) => p.charAt(0)).join('').toUpperCase().slice(0, 2) || '?'
  }

  // Render content with highlighted @mentions
  const renderContentWithMentions = (content: string) => {
    const mentionRegex = /@([a-zA-Z\s]+?)(?=\s|$|@)/g
    const parts = content.split(mentionRegex)

    return parts.map((part, index) => {
      // Every odd index is a mention name (captured group)
      if (index % 2 === 1) {
        return (
          <span key={index} className="text-[#0073ea] font-medium bg-[#e5f4ff] px-1 rounded">
            @{part}
          </span>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={cn(
          'relative bg-white rounded-xl shadow-2xl',
          'w-[600px] max-w-[90vw] h-[700px] max-h-[85vh]',
          'flex flex-col overflow-hidden',
          'animate-in fade-in-0 zoom-in-95 duration-200'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#0073ea] to-[#0060c0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Updates</h2>
              <p className="text-sm text-white/80 truncate max-w-[400px]">{itemName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-gray-200 bg-white px-6">
          <button
            onClick={() => setActiveTab('updates')}
            className={cn(
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
              activeTab === 'updates'
                ? 'border-[#0073ea] text-[#0073ea]'
                : 'border-transparent text-[#676879] hover:text-[#323338] hover:border-gray-300'
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Updates
            {comments.length > 0 && (
              <span className="bg-[#e6e9ef] text-[#676879] text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {comments.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={cn(
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
              activeTab === 'activity'
                ? 'border-[#0073ea] text-[#0073ea]'
                : 'border-transparent text-[#676879] hover:text-[#323338] hover:border-gray-300'
            )}
          >
            <History className="w-4 h-4" />
            Activity Log
            {activities.length > 0 && (
              <span className="bg-[#e6e9ef] text-[#676879] text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {activities.length}
              </span>
            )}
          </button>
        </div>

        {/* Updates Tab (Comments) */}
        <div className={cn('flex-1 overflow-y-auto p-6 space-y-4 bg-[#f8f9fa]', activeTab !== 'updates' && 'hidden')}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-3 border-[#0073ea] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-[#e6e9ef] flex items-center justify-center mb-4">
                <MessageSquare className="w-10 h-10 text-[#c5c7d0]" />
              </div>
              <span className="text-lg font-medium text-[#323338] mb-1">No updates yet</span>
              <span className="text-sm text-[#676879]">Be the first to add an update to this item</span>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Comment Header */}
                <div className="flex items-start gap-3 p-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0073ea] to-[#6161ff] flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-white">
                      {getInitials(comment.user_name || 'Unknown')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-[#323338]">
                        {comment.user_name || 'Unknown User'}
                      </span>
                      <span className="text-xs text-[#9699a6] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(comment.created_at)}
                      </span>
                      {comment.is_edited && (
                        <span className="text-xs text-[#9699a6]">(edited)</span>
                      )}
                    </div>

                    {/* Comment Content or Edit Mode */}
                    {editingComment?.id === comment.id ? (
                      <div className="mt-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-[#0073ea] focus:ring-1 focus:ring-[#0073ea]"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleEditComment(comment)}
                            disabled={submitting}
                            className="px-3 py-1.5 text-xs bg-[#0073ea] text-white rounded-lg hover:bg-[#0060c0] transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingComment(null)
                              setEditContent('')
                            }}
                            className="px-3 py-1.5 text-xs text-[#676879] hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[#323338] whitespace-pre-wrap break-words leading-relaxed">
                        {renderContentWithMentions(comment.content)}
                      </p>
                    )}

                    {/* Comment Actions */}
                    {!editingComment && (
                      <div className="flex items-center gap-3 mt-3">
                        <button
                          onClick={() => {
                            setReplyingTo(comment)
                            inputRef.current?.focus()
                          }}
                          className="flex items-center gap-1 text-xs text-[#676879] hover:text-[#0073ea] transition-colors"
                        >
                          <Reply className="w-3.5 h-3.5" />
                          Reply
                        </button>
                        {comment.user_id === inspectorId && (
                          <>
                            <button
                              onClick={() => {
                                setEditingComment(comment)
                                setEditContent(comment.content)
                              }}
                              className="flex items-center gap-1 text-xs text-[#676879] hover:text-[#0073ea] transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="flex items-center gap-1 text-xs text-[#676879] hover:text-[#e2445c] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="border-t border-gray-100 bg-[#f8f9fa]">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex items-start gap-3 p-4 pl-16 border-b border-gray-50 last:border-b-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#579bfc] to-[#0073ea] flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-white">
                            {getInitials(reply.user_name || 'Unknown')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-[#323338]">
                              {reply.user_name || 'Unknown'}
                            </span>
                            <span className="text-xs text-[#9699a6]">
                              {formatTimeAgo(reply.created_at)}
                            </span>
                            {reply.is_edited && (
                              <span className="text-xs text-[#9699a6]">(edited)</span>
                            )}
                          </div>
                          <p className="text-sm text-[#323338] whitespace-pre-wrap break-words">
                            {renderContentWithMentions(reply.content)}
                          </p>
                          {reply.user_id === inspectorId && (
                            <div className="flex items-center gap-3 mt-2">
                              <button
                                onClick={() => handleDeleteComment(reply.id)}
                                className="flex items-center gap-1 text-xs text-[#676879] hover:text-[#e2445c] transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Activity Log Tab */}
        <div className={cn('flex-1 overflow-y-auto p-6 bg-[#f8f9fa]', activeTab !== 'activity' && 'hidden')}>
          {activityLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-3 border-[#0073ea] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-[#e6e9ef] flex items-center justify-center mb-4">
                <History className="w-10 h-10 text-[#c5c7d0]" />
              </div>
              <span className="text-lg font-medium text-[#323338] mb-1">No activity yet</span>
              <span className="text-sm text-[#676879]">Changes to this item will appear here</span>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-[#e6e9ef]" />

              <div className="space-y-0">
                {activities.map((activity) => (
                  <div key={activity.id} className="relative flex items-start gap-4 py-3 pl-2">
                    {/* Timeline dot */}
                    <div className="relative z-10 w-7 h-7 rounded-full bg-white border-2 border-[#e6e9ef] flex items-center justify-center flex-shrink-0">
                      {getActivityIcon(activity.update_type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="text-sm">
                        <span className="font-medium text-[#323338]">
                          {activity.user_name || 'System'}
                        </span>{' '}
                        <span className="text-[#676879]">
                          {getActivityDescription(activity)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-[#9699a6]">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(activity.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reply indicator - only show on updates tab */}
        {activeTab === 'updates' && replyingTo && (
          <div className="px-6 py-2 bg-[#e5f4ff] border-t border-[#0073ea]/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-[#0073ea]">
              <CornerDownRight className="w-4 h-4" />
              <span>Replying to <strong>{replyingTo.user_name}</strong></span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 hover:bg-[#0073ea]/10 rounded transition-colors"
            >
              <X className="w-4 h-4 text-[#0073ea]" />
            </button>
          </div>
        )}

        {/* Input Area - only show on updates tab */}
        <div className={cn('p-4 border-t border-gray-200 bg-white relative', activeTab !== 'updates' && 'hidden')}>
          {/* Mention suggestions dropdown */}
          {showMentions && mentionSuggestions.length > 0 && (
            <div
              ref={mentionListRef}
              className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-10"
            >
              <div className="px-3 py-2 text-xs font-medium text-[#676879] bg-[#f5f6f8] border-b border-gray-100">
                <AtSign className="w-3 h-3 inline mr-1" />
                Mention someone
              </div>
              {mentionSuggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  onClick={() => insertMention(suggestion)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                    index === mentionIndex ? 'bg-[#e5f4ff]' : 'hover:bg-[#f5f6f8]'
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-[#0073ea] flex items-center justify-center">
                    <span className="text-xs font-semibold text-white">
                      {getInitials(suggestion.name)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#323338]">{suggestion.name}</div>
                    {suggestion.email && (
                      <div className="text-xs text-[#9699a6] truncate">{suggestion.email}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0073ea] to-[#6161ff] flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={newComment}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={replyingTo ? `Reply to ${replyingTo.user_name}...` : 'Write an update... Type @ to mention someone'}
                rows={3}
                className={cn(
                  'w-full px-4 py-3 text-sm border border-gray-200 rounded-xl resize-none',
                  'focus:outline-none focus:border-[#0073ea] focus:ring-2 focus:ring-[#0073ea]/20',
                  'placeholder:text-[#9699a6]'
                )}
              />
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2 text-xs text-[#9699a6]">
                  <AtSign className="w-3.5 h-3.5" />
                  <span>Type @ to mention</span>
                  <span className="mx-2">•</span>
                  <span>Shift+Enter for new line</span>
                </div>
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || submitting || !inspectorId}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all',
                    newComment.trim() && !submitting && inspectorId
                      ? 'bg-[#0073ea] text-white hover:bg-[#0060c0] shadow-md hover:shadow-lg'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  )}
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{replyingTo ? 'Reply' : 'Send'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
