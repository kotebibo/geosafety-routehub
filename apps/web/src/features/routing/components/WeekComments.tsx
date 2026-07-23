'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, MessageSquare, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWeekComments, useAddWeekComment } from '../hooks/useWeekComments'
import { shortDateStr } from '../lib/week'

interface WeekCommentsProps {
  inspectorId: string
  weekStart: string
}

// Comment thread on an officer's week plan — shared by the officer planner and
// the admin per-officer popup. Both sides may post.
export function WeekComments({ inspectorId, weekStart }: WeekCommentsProps) {
  const t = useTranslations()
  const { data: comments = [], isLoading } = useWeekComments(inspectorId, weekStart)
  const add = useAddWeekComment(inspectorId, weekStart)
  const [body, setBody] = useState('')

  const submit = async () => {
    const text = body.trim()
    if (!text) return
    try {
      await add.mutateAsync(text)
      setBody('')
    } catch {
      // surfaced by the disabled/spinner state; keep the text for retry
    }
  }

  return (
    <div className="rounded-2xl border border-border-light bg-bg-primary p-3 shadow-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <MessageSquare className="w-4 h-4 text-monday-primary" />
        <span className="text-sm font-semibold text-text-primary">{t('routing.comments')}</span>
        <span className="text-xs text-text-tertiary">{comments.length}</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 text-text-tertiary animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-text-tertiary py-1">{t('routing.noComments')}</p>
      ) : (
        <div className="space-y-2 mb-2">
          {comments.map(c => (
            <div
              key={c.id}
              className={cn(
                'rounded-xl px-3 py-2 text-sm',
                c.isMine ? 'bg-monday-primary/10' : 'bg-bg-secondary'
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-[11px] font-semibold text-text-secondary truncate">
                  {c.authorName || t('routing.unknownStop')}
                </span>
                <span className="text-[10px] text-text-tertiary flex-shrink-0">
                  {shortDateStr(String(c.createdAt).slice(0, 10))}
                </span>
              </div>
              <p className="text-text-primary whitespace-pre-wrap break-words">{c.body}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={t('routing.addComment')}
          rows={2}
          className="flex-1 px-3 py-2 text-sm rounded-xl border border-border-light bg-bg-primary text-text-primary transition-colors focus:outline-none focus:border-monday-primary focus:ring-2 focus:ring-monday-primary/20 resize-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!body.trim() || add.isPending}
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-monday-primary text-white shadow-sm hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all flex-shrink-0"
        >
          {add.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  )
}
