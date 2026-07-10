'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'
import { MessageSquare, X, History } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  useComments,
  useMentions,
  useFileAttachments,
  useActivity,
  useEscapeClose,
  CommentThread,
  ActivityFeed,
  CommentInput,
} from './updates'

interface UpdatesModalProps {
  isOpen: boolean
  onClose: () => void
  itemId: string
  itemName?: string
  itemType?: string
  onCommentCountChange?: (count: number) => void
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
  const userId = user?.id ?? null

  const [activeTab, setActiveTab] = useState<'updates' | 'activity'>('updates')

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const {
    comments,
    newComment,
    setNewComment,
    loading,
    submitting,
    replyingTo,
    setReplyingTo,
    editingComment,
    setEditingComment,
    editContent,
    setEditContent,
    loadComments,
    submitComment,
    editComment,
    deleteComment,
  } = useComments({ itemId, itemType, userId, onCommentCountChange })

  const { activities, activityLoading, loadActivity } = useActivity({ itemId, itemType })

  const files = useFileAttachments({ itemId, comments })

  const mentions = useMentions({
    value: newComment,
    onChange: setNewComment,
    onSubmit: () => handleSubmitComment(),
    inputRef,
  })

  const handleSubmitComment = () =>
    submitComment({
      mentions: mentions.selectedMentions,
      attachments: files.pendingFiles,
      onSuccess: () => {
        files.clearPendingFiles()
        mentions.clearSelectedMentions()
      },
    })

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

  useEscapeClose(isOpen, onClose)

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
          <CommentThread
            variant="modal"
            comments={comments}
            loading={loading}
            userId={userId}
            submitting={submitting}
            editingComment={editingComment}
            editContent={editContent}
            onEditContentChange={setEditContent}
            onStartEdit={comment => {
              setEditingComment(comment)
              setEditContent(comment.content)
            }}
            onCancelEdit={() => {
              setEditingComment(null)
              setEditContent('')
            }}
            onSaveEdit={editComment}
            onReply={comment => {
              setReplyingTo(comment)
              inputRef.current?.focus()
            }}
            onDelete={deleteComment}
          />
        </div>

        {/* Activity Log Tab */}
        <div
          className={cn(
            'flex-1 overflow-y-auto p-6 bg-bg-secondary',
            activeTab !== 'activity' && 'hidden'
          )}
        >
          <ActivityFeed variant="modal" activities={activities} loading={activityLoading} />
        </div>

        {/* Reply indicator + Input Area - only show on updates tab */}
        <CommentInput
          variant="modal"
          visible={activeTab === 'updates'}
          userId={userId}
          value={newComment}
          submitting={submitting}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          inputRef={inputRef}
          onInputChange={mentions.handleInputChange}
          onKeyDown={mentions.handleKeyDown}
          onSubmit={handleSubmitComment}
          showMentions={mentions.showMentions}
          mentionSuggestions={mentions.mentionSuggestions}
          mentionIndex={mentions.mentionIndex}
          onInsertMention={mentions.insertMention}
          mentionListRef={mentions.mentionListRef}
          pendingFiles={files.pendingFiles}
          uploading={files.uploading}
          fileInputRef={files.fileInputRef}
          onFileSelect={files.handleFileSelect}
          onRemovePendingFile={files.removePendingFile}
        />
      </div>
    </div>,
    document.body
  )
}
