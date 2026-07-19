'use client'

import React from 'react'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'
import { MessageSquare, Clock, Reply, Trash2, Edit2, Download, SmilePlus } from 'lucide-react'
import { formatTimeAgo } from '@/lib/formatTime'

import {
  getInitials,
  getFileIcon,
  formatFileSize,
  parseAttachment,
  renderContentWithMentions,
} from './helpers'
import { REACTION_EMOJIS } from './types'

import type { ItemComment } from '@/types/board'
import type { UpdatesVariant } from './types'

interface CommentReactionsControls {
  pickerCommentId: string | null
  onTogglePicker: (commentId: string) => void
  onToggleReaction: (commentId: string, emojiKey: string) => void
}

interface CommentThreadProps {
  variant: UpdatesVariant
  comments: ItemComment[]
  loading: boolean
  userId: string | null
  submitting: boolean
  editingComment: ItemComment | null
  editContent: string
  onEditContentChange: (value: string) => void
  onStartEdit: (comment: ItemComment) => void
  onCancelEdit: () => void
  onSaveEdit: (comment: ItemComment) => void
  onReply: (comment: ItemComment) => void
  onDelete: (commentId: string) => void
  /** Panel-only: emoji reactions on comments and replies */
  reactions?: CommentReactionsControls
}

export function CommentThread({
  variant,
  comments,
  loading,
  userId,
  submitting,
  editingComment,
  editContent,
  onEditContentChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onReply,
  onDelete,
  reactions,
}: CommentThreadProps) {
  const t = useTranslations()
  const isPanel = variant === 'panel'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div
          className={
            isPanel
              ? 'w-7 h-7 border-2 border-monday-primary border-t-transparent rounded-full animate-spin'
              : 'w-8 h-8 border-3 border-monday-primary border-t-transparent rounded-full animate-spin'
          }
        />
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div
          className={cn(
            'rounded-full bg-border-light flex items-center justify-center',
            isPanel ? 'w-16 h-16 mb-3' : 'w-20 h-20 mb-4'
          )}
        >
          <MessageSquare className={cn('text-border-medium', isPanel ? 'w-8 h-8' : 'w-10 h-10')} />
        </div>
        <span
          className={cn('font-medium text-text-primary mb-1', isPanel ? 'text-base' : 'text-lg')}
        >
          {isPanel
            ? t('boards.updates.comments.emptyTitlePanel')
            : t('boards.updates.comments.emptyTitleModal')}
        </span>
        <span className="text-sm text-text-secondary">
          {isPanel
            ? t('boards.updates.comments.emptyDescriptionPanel')
            : t('boards.updates.comments.emptyDescriptionModal')}
        </span>
      </div>
    )
  }

  const renderReactionsDisplay = (comment: ItemComment, isReply: boolean) => {
    if (!reactions || !comment.reactions || Object.keys(comment.reactions).length === 0) return null
    return (
      <div className={cn('flex flex-wrap', isReply ? 'gap-1 mt-1.5' : 'gap-1.5 mt-2')}>
        {Object.entries(comment.reactions as Record<string, string[]>).map(
          ([emojiKey, userIds]) => {
            const emojiInfo = REACTION_EMOJIS.find(e => e.key === emojiKey)
            if (!emojiInfo || !userIds.length) return null
            const hasReacted = userId && userIds.includes(userId)
            return (
              <button
                key={emojiKey}
                onClick={() => reactions.onToggleReaction(comment.id, emojiKey)}
                className={cn(
                  isReply
                    ? 'flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border transition-colors'
                    : 'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors',
                  hasReacted
                    ? 'bg-monday-primary/10 border-monday-primary/30 text-text-link'
                    : isReply
                      ? 'bg-bg-primary border-border-light text-text-secondary hover:border-border-medium'
                      : 'bg-bg-secondary border-border-light text-text-secondary hover:border-border-medium'
                )}
              >
                <span className={isReply ? 'text-xs' : 'text-sm'}>{emojiInfo.emoji}</span>
                <span className="font-medium">{userIds.length}</span>
              </button>
            )
          }
        )}
      </div>
    )
  }

  const renderReactionPicker = (commentId: string, isReply: boolean) => {
    if (!reactions || reactions.pickerCommentId !== commentId) return null
    return (
      <div
        className={cn(
          'flex items-center gap-1 p-1.5 rounded-lg border border-border-light w-fit',
          isReply ? 'mt-1.5 bg-bg-primary' : 'mt-2 bg-bg-secondary'
        )}
      >
        {REACTION_EMOJIS.map(({ key, emoji }) => (
          <button
            key={key}
            onClick={() => reactions.onToggleReaction(commentId, key)}
            className={cn(
              'flex items-center justify-center rounded hover:bg-bg-hover transition-colors',
              isReply ? 'w-6 h-6 text-sm' : 'w-7 h-7 text-base'
            )}
          >
            {emoji}
          </button>
        ))}
      </div>
    )
  }

  return (
    <>
      {comments.map(comment => (
        <div
          key={comment.id}
          className={cn(
            'bg-bg-primary shadow-sm border border-border-light overflow-hidden',
            isPanel ? 'rounded-lg' : 'rounded-xl'
          )}
        >
          {/* Comment Header */}
          <div className={cn('flex items-start gap-3', isPanel ? 'p-3.5' : 'p-4')}>
            <div
              className={cn(
                'rounded-full bg-gradient-to-br from-monday-primary to-indigo-500 flex items-center justify-center flex-shrink-0',
                isPanel ? 'w-8 h-8' : 'w-10 h-10'
              )}
            >
              <span className={cn('font-semibold text-white', isPanel ? 'text-xs' : 'text-sm')}>
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
                {comment.is_edited && <span className="text-xs text-text-tertiary">(edited)</span>}
              </div>

              {/* Comment Content or Edit Mode */}
              {editingComment?.id === comment.id ? (
                <div className="mt-2">
                  <textarea
                    value={editContent}
                    onChange={e => onEditContentChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-bg-primary text-text-primary border border-border-light rounded-lg resize-none focus:outline-none focus:border-monday-primary focus:ring-1 focus:ring-monday-primary"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => onSaveEdit(comment)}
                      disabled={submitting}
                      className="px-3 py-1.5 text-xs bg-monday-primary text-text-inverse rounded-lg hover:bg-[var(--monday-primary-hover)] transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={onCancelEdit}
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
                <div className={cn('flex flex-wrap gap-2', isPanel ? 'mt-2.5' : 'mt-3')}>
                  {comment.attachments.map((att, idx) => {
                    const parsed = parseAttachment(att, idx)
                    const isImage = parsed.type?.startsWith('image/')
                    return (
                      <a
                        key={idx}
                        href={parsed.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          'group flex items-center gap-2 bg-bg-secondary border border-border-light rounded-lg hover:border-monday-primary/50 transition-colors',
                          isPanel ? 'px-2.5 py-1.5 max-w-[220px]' : 'px-3 py-2 max-w-[240px]'
                        )}
                      >
                        {isImage ? (
                          <img
                            src={parsed.url}
                            alt={parsed.name}
                            className={cn(
                              'rounded object-cover flex-shrink-0',
                              isPanel ? 'w-7 h-7' : 'w-8 h-8'
                            )}
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
                        <Download
                          className={cn(
                            'text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0',
                            isPanel ? 'w-3 h-3' : 'w-3.5 h-3.5'
                          )}
                        />
                      </a>
                    )
                  })}
                </div>
              )}

              {/* Comment Actions */}
              {!editingComment && (
                <div className={cn('flex items-center gap-3', isPanel ? 'mt-2.5' : 'mt-3')}>
                  <button
                    onClick={() => onReply(comment)}
                    className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-link transition-colors"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    Reply
                  </button>
                  {reactions && (
                    <button
                      onClick={() => reactions.onTogglePicker(comment.id)}
                      className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-link transition-colors"
                    >
                      <SmilePlus className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {comment.user_id === userId && (
                    <>
                      <button
                        onClick={() => onStartEdit(comment)}
                        className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-link transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(comment.id)}
                        className="flex items-center gap-1 text-xs text-text-secondary hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Emoji Picker */}
              {renderReactionPicker(comment.id, false)}

              {/* Reactions Display */}
              {renderReactionsDisplay(comment, false)}
            </div>
          </div>

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="border-t border-border-light bg-bg-secondary">
              {comment.replies.map(reply => (
                <div
                  key={reply.id}
                  className={cn(
                    'flex items-start gap-3 border-b border-bg-secondary last:border-b-0',
                    isPanel ? 'p-3.5 pl-14' : 'p-4 pl-16'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-full bg-gradient-to-br from-blue-500 to-monday-primary flex items-center justify-center flex-shrink-0',
                      isPanel ? 'w-7 h-7' : 'w-8 h-8'
                    )}
                  >
                    <span
                      className={cn(
                        'font-semibold text-white',
                        isPanel ? 'text-[10px]' : 'text-xs'
                      )}
                    >
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
                    {reactions ? (
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => reactions.onTogglePicker(reply.id)}
                          className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-link transition-colors"
                        >
                          <SmilePlus className="w-3 h-3" />
                        </button>
                        {reply.user_id === userId && (
                          <button
                            onClick={() => onDelete(reply.id)}
                            className="flex items-center gap-1 text-xs text-text-secondary hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        )}
                      </div>
                    ) : (
                      reply.user_id === userId && (
                        <div className="flex items-center gap-3 mt-2">
                          <button
                            onClick={() => onDelete(reply.id)}
                            className="flex items-center gap-1 text-xs text-text-secondary hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      )
                    )}
                    {renderReactionPicker(reply.id, true)}
                    {renderReactionsDisplay(reply, true)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  )
}
