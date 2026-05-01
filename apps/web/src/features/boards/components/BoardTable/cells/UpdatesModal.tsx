'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import {
  MessageSquare,
  Send,
  X,
  Clock,
  User,
  Reply,
  CornerDownRight,
  AtSign,
  Trash2,
  Edit2,
  Check,
  History,
  ArrowRightLeft,
  UserCheck,
  FileEdit,
  PlusCircle,
  Paperclip,
  File,
  Image,
  FileText,
  Download,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { activityService } from '@/features/boards/services/activity.service'
import { formatTimeAgo } from '@/lib/formatTime'
import { useAuth } from '@/contexts/AuthContext'
import { useInspectorId } from '@/hooks/useInspectorId'
import { useInspectors } from '@/features/inspectors/hooks/useInspectors'
import type { ItemComment, ItemUpdate } from '@/types/board'

interface UpdatesModalProps {
  isOpen: boolean
  onClose: () => void
  itemId: string
  itemName?: string
  itemType?: string
  onCommentCountChange?: (count: number) => void
}

interface FileAttachment {
  id: string
  name: string
  url: string
  type: string
  size: number
  path?: string
}

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

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

  // File attachment state
  const [pendingFiles, setPendingFiles] = useState<FileAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const mentionListRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Filter inspectors for mention suggestions
  const mentionSuggestions: MentionSuggestion[] =
    inspectors
      ?.filter(inspector => {
        const name = (inspector.full_name || '').toLowerCase()
        const email = (inspector.email || '').toLowerCase()
        const search = mentionSearch.toLowerCase()
        return name.includes(search) || email.includes(search)
      })
      .map(inspector => ({
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
      case 'created':
        return <PlusCircle className="w-4 h-4 text-green-500" />
      case 'updated':
        return <FileEdit className="w-4 h-4 text-text-link" />
      case 'status_changed':
        return <ArrowRightLeft className="w-4 h-4 text-orange-500" />
      case 'assigned':
      case 'reassigned':
        return <UserCheck className="w-4 h-4 text-purple-500" />
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-blue-500" />
      default:
        return <History className="w-4 h-4 text-text-secondary" />
    }
  }

  const getActivityDescription = (update: ItemUpdate) => {
    const fieldName =
      update.metadata?.displayName || update.column_name || update.field_name || 'field'
    switch (update.update_type) {
      case 'created':
        return 'created this item'
      case 'status_changed':
        return `changed ${fieldName} from "${update.old_value || '-'}" to "${update.new_value || '-'}"`
      case 'assigned':
        return update.content || `assigned ${fieldName}`
      case 'reassigned':
        return update.content || `reassigned ${fieldName}`
      case 'comment':
        return `commented: "${update.content?.substring(0, 60) || ''}${(update.content?.length || 0) > 60 ? '...' : ''}"`
      case 'updated':
        if (update.old_value && update.new_value) {
          return `changed ${fieldName} from "${update.old_value}" to "${update.new_value}"`
        }
        if (update.new_value) {
          return `set ${fieldName} to "${update.new_value}"`
        }
        return `updated ${fieldName}`
      default:
        return update.content || `updated ${fieldName}`
    }
  }

  const handleSubmitComment = async () => {
    if ((!newComment.trim() && pendingFiles.length === 0) || !itemId || submitting || !inspectorId)
      return

    setSubmitting(true)
    try {
      await activityService.createComment({
        item_type: itemType,
        item_id: itemId,
        user_id: inspectorId,
        content:
          newComment.trim() ||
          (pendingFiles.length > 0 ? `Attached ${pendingFiles.length} file(s)` : ''),
        parent_comment_id: replyingTo?.id,
        mentions: selectedMentions,
        attachments: pendingFiles.map(f =>
          JSON.stringify({ name: f.name, url: f.url, type: f.type, size: f.size, path: f.path })
        ),
      })
      setNewComment('')
      setPendingFiles([])
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
  const insertMention = useCallback(
    (suggestion: MentionSuggestion) => {
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
    },
    [newComment, cursorPosition, selectedMentions]
  )

  // Handle keyboard navigation in mention list
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && mentionSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex(prev => (prev + 1) % mentionSuggestions.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex(prev => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length)
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

  // formatTimeAgo imported from @/lib/formatTime

  const getInitials = (name: string) => {
    const parts = name.split(' ')
    return (
      parts
        .map(p => p.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2) || '?'
    )
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-4 h-4 text-blue-500" />
    if (type === 'application/pdf') return <FileText className="w-4 h-4 text-red-500" />
    return <File className="w-4 h-4 text-text-secondary" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    setUploading(true)
    try {
      const newFiles: FileAttachment[] = []
      for (const file of Array.from(selectedFiles)) {
        if (file.size > MAX_FILE_SIZE) {
          console.error(`File ${file.name} is too large (max 20MB)`)
          continue
        }

        const fileExt = file.name.split('.').pop()
        const fileName = `${itemId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `comment-attachments/${fileName}`

        try {
          const { error } = await supabase.storage.from('attachments').upload(filePath, file)
          if (error) {
            console.error('Upload error:', error)
            continue
          }

          const { data: urlData } = await supabase.storage
            .from('attachments')
            .createSignedUrl(filePath, 60 * 60 * 24 * 365)

          newFiles.push({
            id: `file_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            name: file.name,
            url: urlData?.signedUrl || '',
            type: file.type,
            size: file.size,
            path: filePath,
          })
        } catch (err) {
          console.error('Upload failed:', err)
        }
      }
      setPendingFiles(prev => [...prev, ...newFiles])
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removePendingFile = (fileId: string) => {
    setPendingFiles(prev => prev.filter(f => f.id !== fileId))
  }

  // Render content with highlighted @mentions
  const renderContentWithMentions = (content: string) => {
    const mentionRegex = /@([a-zA-Z\s]+?)(?=\s|$|@)/g
    const parts = content.split(mentionRegex)

    return parts.map((part, index) => {
      // Every odd index is a mention name (captured group)
      if (index % 2 === 1) {
        return (
          <span key={index} className="text-text-link font-medium bg-bg-selected px-1 rounded">
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        ref={modalRef}
        className={cn(
          'relative bg-bg-primary rounded-xl shadow-2xl',
          'w-[600px] max-w-[90vw] h-[700px] max-h-[85vh]',
          'flex flex-col overflow-hidden',
          'animate-in fade-in-0 zoom-in-95 duration-200'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light bg-gradient-to-r from-monday-primary to-blue-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Updates</h2>
              <p className="text-sm text-white/80 truncate max-w-[400px]">{itemName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/20 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-border-light bg-bg-primary px-6">
          <button
            onClick={() => setActiveTab('updates')}
            className={cn(
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
              activeTab === 'updates'
                ? 'border-monday-primary text-text-link'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-medium'
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Updates
            {comments.length > 0 && (
              <span className="bg-border-light text-text-secondary text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {comments.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={cn(
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
              activeTab === 'activity'
                ? 'border-monday-primary text-text-link'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-medium'
            )}
          >
            <History className="w-4 h-4" />
            Activity Log
            {activities.length > 0 && (
              <span className="bg-border-light text-text-secondary text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {activities.length}
              </span>
            )}
          </button>
        </div>

        {/* Updates Tab (Comments) */}
        <div
          className={cn(
            'flex-1 overflow-y-auto p-6 space-y-4 bg-bg-secondary',
            activeTab !== 'updates' && 'hidden'
          )}
        >
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-3 border-monday-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-border-light flex items-center justify-center mb-4">
                <MessageSquare className="w-10 h-10 text-border-medium" />
              </div>
              <span className="text-lg font-medium text-text-primary mb-1">No updates yet</span>
              <span className="text-sm text-text-secondary">
                Be the first to add an update to this item
              </span>
            </div>
          ) : (
            comments.map(comment => (
              <div
                key={comment.id}
                className="bg-bg-primary rounded-xl shadow-sm border border-border-light overflow-hidden"
              >
                {/* Comment Header */}
                <div className="flex items-start gap-3 p-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-monday-primary to-indigo-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-white">
                      {getInitials(comment.user_name || 'Unknown')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-text-primary">
                        {comment.user_name || 'Unknown User'}
                      </span>
                      <span className="text-xs text-text-tertiary flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(comment.created_at ?? '')}
                      </span>
                      {comment.is_edited && (
                        <span className="text-xs text-text-tertiary">(edited)</span>
                      )}
                    </div>

                    {/* Comment Content or Edit Mode */}
                    {editingComment?.id === comment.id ? (
                      <div className="mt-2">
                        <textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-bg-primary text-text-primary border border-border-light rounded-lg resize-none focus:outline-none focus:border-monday-primary focus:ring-1 focus:ring-monday-primary"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleEditComment(comment)}
                            disabled={submitting}
                            className="px-3 py-1.5 text-xs bg-monday-primary text-text-inverse rounded-lg hover:bg-[var(--monday-primary-hover)] transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingComment(null)
                              setEditContent('')
                            }}
                            className="px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-text-primary whitespace-pre-wrap break-words leading-relaxed">
                        {renderContentWithMentions(comment.content)}
                      </p>
                    )}

                    {/* Comment Attachments */}
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {comment.attachments.map((att, idx) => {
                          let parsed: any = att
                          try {
                            parsed = typeof att === 'string' ? JSON.parse(att) : att
                          } catch {
                            // plain URL string
                            parsed = { name: `File ${idx + 1}`, url: att, type: '', size: 0 }
                          }
                          const isImage = parsed.type?.startsWith('image/')
                          return (
                            <a
                              key={idx}
                              href={parsed.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex items-center gap-2 px-3 py-2 bg-bg-secondary border border-border-light rounded-lg hover:border-monday-primary/50 transition-colors max-w-[240px]"
                            >
                              {isImage ? (
                                <img
                                  src={parsed.url}
                                  alt={parsed.name}
                                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                                />
                              ) : (
                                getFileIcon(parsed.type || '')
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-text-primary truncate">
                                  {parsed.name}
                                </p>
                                {parsed.size > 0 && (
                                  <p className="text-[10px] text-text-tertiary">
                                    {formatFileSize(parsed.size)}
                                  </p>
                                )}
                              </div>
                              <Download className="w-3.5 h-3.5 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                            </a>
                          )
                        })}
                      </div>
                    )}

                    {/* Comment Actions */}
                    {!editingComment && (
                      <div className="flex items-center gap-3 mt-3">
                        <button
                          onClick={() => {
                            setReplyingTo(comment)
                            inputRef.current?.focus()
                          }}
                          className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-link transition-colors"
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
                              className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-link transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="flex items-center gap-1 text-xs text-text-secondary hover:text-red-500 transition-colors"
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
                  <div className="border-t border-border-light bg-bg-secondary">
                    {comment.replies.map(reply => (
                      <div
                        key={reply.id}
                        className="flex items-start gap-3 p-4 pl-16 border-b border-bg-secondary last:border-b-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-monday-primary flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-white">
                            {getInitials(reply.user_name || 'Unknown')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-text-primary">
                              {reply.user_name || 'Unknown'}
                            </span>
                            <span className="text-xs text-text-tertiary">
                              {formatTimeAgo(reply.created_at ?? '')}
                            </span>
                            {reply.is_edited && (
                              <span className="text-xs text-text-tertiary">(edited)</span>
                            )}
                          </div>
                          <p className="text-sm text-text-primary whitespace-pre-wrap break-words">
                            {renderContentWithMentions(reply.content)}
                          </p>
                          {reply.user_id === inspectorId && (
                            <div className="flex items-center gap-3 mt-2">
                              <button
                                onClick={() => handleDeleteComment(reply.id)}
                                className="flex items-center gap-1 text-xs text-text-secondary hover:text-red-500 transition-colors"
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
        <div
          className={cn(
            'flex-1 overflow-y-auto p-6 bg-bg-secondary',
            activeTab !== 'activity' && 'hidden'
          )}
        >
          {activityLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-3 border-monday-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-border-light flex items-center justify-center mb-4">
                <History className="w-10 h-10 text-border-medium" />
              </div>
              <span className="text-lg font-medium text-text-primary mb-1">No activity yet</span>
              <span className="text-sm text-text-secondary">
                Changes to this item will appear here
              </span>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-border-light" />

              <div className="space-y-0">
                {activities.map(activity => (
                  <div key={activity.id} className="relative flex items-start gap-4 py-3 pl-2">
                    {/* Timeline dot */}
                    <div className="relative z-10 w-7 h-7 rounded-full bg-bg-primary border-2 border-border-light flex items-center justify-center flex-shrink-0">
                      {getActivityIcon(activity.update_type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="text-sm">
                        <span className="font-medium text-text-primary">
                          {activity.user_name || 'System'}
                        </span>{' '}
                        <span className="text-text-secondary">
                          {getActivityDescription(activity)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-text-tertiary">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(activity.created_at ?? '')}
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
          <div className="px-6 py-2 bg-bg-selected border-t border-monday-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-text-link">
              <CornerDownRight className="w-4 h-4" />
              <span>
                Replying to <strong>{replyingTo.user_name}</strong>
              </span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 hover:bg-monday-primary/10 rounded transition-colors"
            >
              <X className="w-4 h-4 text-text-link" />
            </button>
          </div>
        )}

        {/* Input Area - only show on updates tab */}
        <div
          className={cn(
            'p-4 border-t border-border-light bg-bg-primary relative',
            activeTab !== 'updates' && 'hidden'
          )}
        >
          {/* Mention suggestions dropdown */}
          {showMentions && mentionSuggestions.length > 0 && (
            <div
              ref={mentionListRef}
              className="absolute bottom-full left-4 right-4 mb-2 bg-bg-primary rounded-lg shadow-lg border border-border-light overflow-hidden z-10"
            >
              <div className="px-3 py-2 text-xs font-medium text-text-secondary bg-bg-secondary border-b border-border-light">
                <AtSign className="w-3 h-3 inline mr-1" />
                Mention someone
              </div>
              {mentionSuggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  onClick={() => insertMention(suggestion)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                    index === mentionIndex ? 'bg-bg-selected' : 'hover:bg-bg-hover'
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-monday-primary flex items-center justify-center">
                    <span className="text-xs font-semibold text-text-inverse">
                      {getInitials(suggestion.name)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary">{suggestion.name}</div>
                    {suggestion.email && (
                      <div className="text-xs text-text-tertiary truncate">{suggestion.email}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-monday-primary to-indigo-500 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={newComment}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  replyingTo
                    ? `Reply to ${replyingTo.user_name}...`
                    : 'Write an update... Type @ to mention someone'
                }
                rows={3}
                className={cn(
                  'w-full px-4 py-3 text-sm bg-bg-primary text-text-primary border border-border-light rounded-xl resize-none',
                  'focus:outline-none focus:border-monday-primary focus:ring-2 focus:ring-monday-primary/20',
                  'placeholder:text-text-tertiary'
                )}
              />

              {/* Pending file attachments */}
              {pendingFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {pendingFiles.map(file => (
                    <div
                      key={file.id}
                      className="flex items-center gap-2 px-2.5 py-1.5 bg-bg-secondary border border-border-light rounded-lg text-xs max-w-[200px]"
                    >
                      {getFileIcon(file.type)}
                      <span className="truncate text-text-primary">{file.name}</span>
                      <button
                        onClick={() => removePendingFile(file.id)}
                        className="p-0.5 hover:bg-bg-hover rounded transition-colors flex-shrink-0"
                      >
                        <X className="w-3 h-3 text-text-tertiary" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Uploading indicator */}
              {uploading && (
                <div className="flex items-center gap-2 mt-2 text-xs text-text-secondary">
                  <div className="w-3.5 h-3.5 border-2 border-monday-primary border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </div>
              )}

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-3">
                  {/* File upload button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,application/pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-monday-primary transition-colors disabled:opacity-50"
                  >
                    <Paperclip className="w-4 h-4" />
                    <span>Attach</span>
                  </button>
                  <div className="flex items-center gap-2 text-xs text-text-tertiary">
                    <AtSign className="w-3.5 h-3.5" />
                    <span>@ to mention</span>
                  </div>
                </div>
                <button
                  onClick={handleSubmitComment}
                  disabled={
                    (!newComment.trim() && pendingFiles.length === 0) || submitting || !inspectorId
                  }
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all',
                    (newComment.trim() || pendingFiles.length > 0) && !submitting && inspectorId
                      ? 'bg-monday-primary text-text-inverse hover:bg-[var(--monday-primary-hover)] shadow-md hover:shadow-lg'
                      : 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
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
