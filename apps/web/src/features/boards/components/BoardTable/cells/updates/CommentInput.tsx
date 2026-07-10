'use client'

import React from 'react'

import { cn } from '@/lib/utils'
import { Send, X, User, CornerDownRight, AtSign, Paperclip } from 'lucide-react'

import { getFileIcon } from './helpers'
import { MentionDropdown } from './MentionDropdown'

import type { ItemComment } from '@/types/board'
import type { FileAttachment, MentionSuggestion, UpdatesVariant } from './types'

interface CommentInputProps {
  variant: UpdatesVariant
  /** Whether the updates tab is active (reply indicator renders and input un-hides) */
  visible: boolean
  userId: string | null
  value: string
  submitting: boolean
  replyingTo: ItemComment | null
  onCancelReply: () => void
  inputRef: React.RefObject<HTMLTextAreaElement>
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSubmit: () => void
  // Mentions
  showMentions: boolean
  mentionSuggestions: MentionSuggestion[]
  mentionIndex: number
  onInsertMention: (suggestion: MentionSuggestion) => void
  mentionListRef: React.RefObject<HTMLDivElement>
  // File attachments
  pendingFiles: FileAttachment[]
  uploading: boolean
  fileInputRef: React.RefObject<HTMLInputElement>
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemovePendingFile: (fileId: string) => void
}

export function CommentInput({
  variant,
  visible,
  userId,
  value,
  submitting,
  replyingTo,
  onCancelReply,
  inputRef,
  onInputChange,
  onKeyDown,
  onSubmit,
  showMentions,
  mentionSuggestions,
  mentionIndex,
  onInsertMention,
  mentionListRef,
  pendingFiles,
  uploading,
  fileInputRef,
  onFileSelect,
  onRemovePendingFile,
}: CommentInputProps) {
  const isPanel = variant === 'panel'

  return (
    <>
      {/* Reply indicator - only show on updates tab */}
      {visible && replyingTo && (
        <div
          className={cn(
            'py-2 bg-bg-selected border-t border-monday-primary/20 flex items-center justify-between',
            isPanel ? 'px-5' : 'px-6'
          )}
        >
          <div className="flex items-center gap-2 text-sm text-text-link">
            <CornerDownRight className="w-4 h-4" />
            <span>
              Replying to <strong>{replyingTo.user_name}</strong>
            </span>
          </div>
          <button
            onClick={onCancelReply}
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
          !visible && 'hidden'
        )}
      >
        {/* Mention suggestions dropdown */}
        {showMentions && mentionSuggestions.length > 0 && (
          <MentionDropdown
            variant={variant}
            suggestions={mentionSuggestions}
            activeIndex={mentionIndex}
            onSelect={onInsertMention}
            listRef={mentionListRef}
          />
        )}

        <div className="flex gap-3">
          <div
            className={cn(
              'rounded-full bg-gradient-to-br from-monday-primary to-indigo-500 flex items-center justify-center flex-shrink-0',
              isPanel ? 'w-8 h-8' : 'w-10 h-10'
            )}
          >
            <User className={cn('text-white', isPanel ? 'w-4 h-4' : 'w-5 h-5')} />
          </div>
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={value}
              onChange={onInputChange}
              onKeyDown={onKeyDown}
              placeholder={
                replyingTo
                  ? `Reply to ${replyingTo.user_name}...`
                  : isPanel
                    ? 'დაწერეთ განახლება... @ მენშენისთვის'
                    : 'Write an update... Type @ to mention someone'
              }
              rows={isPanel ? 2 : 3}
              className={cn(
                'w-full text-sm bg-bg-primary text-text-primary border border-border-light resize-none',
                'focus:outline-none focus:border-monday-primary',
                'placeholder:text-text-tertiary',
                isPanel
                  ? 'px-3 py-2.5 rounded-lg focus:ring-1 focus:ring-monday-primary/20'
                  : 'px-4 py-3 rounded-xl focus:ring-2 focus:ring-monday-primary/20'
              )}
            />

            {/* Pending file attachments */}
            {pendingFiles.length > 0 && (
              <div className={cn('flex flex-wrap mt-2', isPanel ? 'gap-1.5' : 'gap-2')}>
                {pendingFiles.map(file => (
                  <div
                    key={file.id}
                    className={cn(
                      'flex items-center bg-bg-secondary border border-border-light text-xs',
                      isPanel
                        ? 'gap-1.5 px-2 py-1 rounded max-w-[180px]'
                        : 'gap-2 px-2.5 py-1.5 rounded-lg max-w-[200px]'
                    )}
                  >
                    {getFileIcon(file.type)}
                    <span className="truncate text-text-primary">{file.name}</span>
                    <button
                      onClick={() => onRemovePendingFile(file.id)}
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
                <div
                  className={cn(
                    'border-2 border-monday-primary border-t-transparent rounded-full animate-spin',
                    isPanel ? 'w-3 h-3' : 'w-3.5 h-3.5'
                  )}
                />
                {isPanel ? 'იტვირთება...' : 'Uploading...'}
              </div>
            )}

            <div className={cn('flex items-center justify-between', isPanel ? 'mt-2' : 'mt-3')}>
              <div className={cn('flex items-center', isPanel ? 'gap-2' : 'gap-3')}>
                {/* File upload button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.7z"
                  onChange={onFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className={cn(
                    'flex items-center text-xs text-text-secondary hover:text-monday-primary transition-colors disabled:opacity-50',
                    isPanel ? 'gap-1' : 'gap-1.5'
                  )}
                >
                  <Paperclip className={isPanel ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                  <span>{isPanel ? 'მიმაგრება' : 'Attach'}</span>
                </button>
                {!isPanel && (
                  <div className="flex items-center gap-2 text-xs text-text-tertiary">
                    <AtSign className="w-3.5 h-3.5" />
                    <span>@ to mention</span>
                  </div>
                )}
              </div>
              <button
                onClick={onSubmit}
                disabled={(!value.trim() && pendingFiles.length === 0) || submitting || !userId}
                className={cn(
                  isPanel
                    ? 'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all'
                    : 'flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all',
                  (value.trim() || pendingFiles.length > 0) && !submitting && userId
                    ? isPanel
                      ? 'bg-monday-primary text-text-inverse hover:bg-[var(--monday-primary-hover)]'
                      : 'bg-monday-primary text-text-inverse hover:bg-[var(--monday-primary-hover)] shadow-md hover:shadow-lg'
                    : 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
                )}
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className={isPanel ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                    <span>
                      {replyingTo ? (isPanel ? 'პასუხი' : 'Reply') : isPanel ? 'გაგზავნა' : 'Send'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
