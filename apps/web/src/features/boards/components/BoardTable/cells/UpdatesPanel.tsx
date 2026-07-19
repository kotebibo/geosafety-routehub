'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'
import { MessageSquare, X, History, FolderOpen } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { FilePreviewModal } from './FilePreviewModal'
import {
  useComments,
  useMentions,
  useFileAttachments,
  useActivity,
  useEscapeClose,
  CommentThread,
  ActivityFeed,
  CommentInput,
  FilesTab,
} from './updates'
import { activityService } from '@/features/boards/services/activity.service'

import type { BoardColumn } from '@/types/board'

interface UpdatesPanelProps {
  isOpen: boolean
  onClose: () => void
  itemId: string
  itemName?: string
  itemType?: string
  row?: any
  allColumns?: BoardColumn[]
  onCommentCountChange?: (count: number) => void
}

type TabType = 'updates' | 'files' | 'activity'

export function UpdatesPanel({
  isOpen,
  onClose,
  itemId,
  itemName,
  itemType = 'board_item',
  row,
  allColumns,
  onCommentCountChange,
}: UpdatesPanelProps) {
  const t = useTranslations()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id ?? null

  const [activeTab, setActiveTab] = useState<TabType>('updates')

  // Reaction picker state (panel-only feature)
  const [reactionPickerCommentId, setReactionPickerCommentId] = useState<string | null>(null)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const {
    comments,
    setComments,
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
  } = useComments({
    itemId,
    itemType,
    userId,
    onCommentCountChange,
    onCommentsMutated: () => queryClient.invalidateQueries({ queryKey: ['comment-counts'] }),
  })

  const { activities, activityLoading, loadActivity } = useActivity({ itemId, itemType })

  const files = useFileAttachments({ itemId, comments, row, allColumns })

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

  // Load data when panel opens or tab changes
  useEffect(() => {
    if (isOpen && itemId) {
      if (activeTab === 'updates' || activeTab === 'files') {
        loadComments()
      }
      if (activeTab === 'activity') {
        loadActivity()
      }
    }
  }, [isOpen, itemId, activeTab])

  useEscapeClose(isOpen, onClose)

  const handleToggleReaction = async (commentId: string, emojiKey: string) => {
    if (!userId) return
    try {
      const updatedReactions = await activityService.toggleReaction(commentId, userId, emojiKey)
      // Update local state optimistically
      setComments(prev =>
        prev.map(c => {
          if (c.id === commentId) return { ...c, reactions: updatedReactions }
          // Check replies
          if (c.replies?.length) {
            return {
              ...c,
              replies: c.replies.map(r =>
                r.id === commentId ? { ...r, reactions: updatedReactions } : r
              ),
            }
          }
          return c
        })
      )
      setReactionPickerCommentId(null)
    } catch (error) {
      console.error('Error toggling reaction:', error)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Slide-in Panel */}
      <div
        ref={panelRef}
        className={cn(
          'relative bg-bg-primary shadow-2xl',
          'w-[560px] max-w-[95vw] h-full',
          'flex flex-col overflow-hidden',
          'animate-in slide-in-from-right duration-200'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-light">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-monday-primary/10 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4.5 h-4.5 text-monday-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate max-w-[380px]">
                {itemName || t('boards.updatesPanel.defaultItemName')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors"
          >
            <X className="w-4.5 h-4.5 text-text-secondary" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-border-light px-5 gap-1">
          {[
            {
              key: 'updates' as TabType,
              label: t('boards.updatesPanel.updatesTab'),
              icon: MessageSquare,
              count: comments.length,
            },
            {
              key: 'files' as TabType,
              label: t('boards.updatesPanel.filesTab'),
              icon: FolderOpen,
              count: files.aggregatedFiles.length,
            },
            {
              key: 'activity' as TabType,
              label: t('boards.updatesPanel.activityTab'),
              icon: History,
              count: activities.length,
            },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-3 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5',
                activeTab === tab.key
                  ? 'border-monday-primary text-text-link'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-medium'
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.count > 0 && (
                <span className="bg-border-light text-text-secondary text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Updates Tab */}
        <div
          className={cn(
            'flex-1 overflow-y-auto p-5 space-y-3 bg-bg-secondary',
            activeTab !== 'updates' && 'hidden'
          )}
        >
          <CommentThread
            variant="panel"
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
            reactions={{
              pickerCommentId: reactionPickerCommentId,
              onTogglePicker: commentId =>
                setReactionPickerCommentId(
                  reactionPickerCommentId === commentId ? null : commentId
                ),
              onToggleReaction: handleToggleReaction,
            }}
          />
        </div>

        {/* Files Tab */}
        <div
          className={cn(
            'flex-1 overflow-y-auto bg-bg-secondary flex flex-col',
            activeTab !== 'files' && 'hidden'
          )}
        >
          <FilesTab
            loading={loading}
            aggregatedFiles={files.aggregatedFiles}
            onOpenPreview={files.openFilePreview}
          />
        </div>

        {/* Activity Log Tab */}
        <div
          className={cn(
            'flex-1 overflow-y-auto p-5 bg-bg-secondary',
            activeTab !== 'activity' && 'hidden'
          )}
        >
          <ActivityFeed variant="panel" activities={activities} loading={activityLoading} />
        </div>

        {/* Reply indicator + Input Area - only show on updates tab */}
        <CommentInput
          variant="panel"
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

      {/* File Preview — full-screen dark overlay */}
      {files.previewFile && (
        <FilePreviewModal
          onClose={files.closeFilePreview}
          file={files.previewFile}
          files={files.previewableFiles}
          currentIndex={files.previewFileIndex}
          onNavigate={files.handlePreviewNavigate}
        />
      )}
    </div>,
    document.body
  )
}
