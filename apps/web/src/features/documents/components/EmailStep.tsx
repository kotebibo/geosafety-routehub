'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Mail } from 'lucide-react'
import { Button } from '@/shared/components/ui'
import { useUpdateColumn } from '@/features/boards/hooks/useBoardColumns'
import type { BoardColumn } from '@/types/board'
import type { BoardItem } from '@/features/boards/types/board'

// Matches email-shaped tokens anywhere in a string — recipient cells are
// often free text holding several addresses split by spaces/commas/newlines.
const EMAIL_TOKEN_REGEX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g

export function parseEmails(value: unknown): string[] {
  if (value === null || value === undefined) return []
  const matches = String(value).match(EMAIL_TOKEN_REGEX)
  if (!matches) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const email of matches) {
    const key = email.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      result.push(email)
    }
  }
  return result
}

const RECIPIENT_COLUMN_TYPES = ['email', 'text']

interface EmailStepProps {
  defaultSubject: string
  defaultMessage?: string
  sending: boolean
  onSend: (to: string[], subject: string, message?: string) => void
  onSkip: () => void
  columns?: BoardColumn[]
  item?: BoardItem
}

export function EmailStep({
  defaultSubject,
  defaultMessage = '',
  sending,
  onSend,
  onSkip,
  columns = [],
  item,
}: EmailStepProps) {
  const updateColumn = useUpdateColumn()

  const candidateColumns = useMemo(
    () => columns.filter(c => RECIPIENT_COLUMN_TYPES.includes(c.column_type)),
    [columns]
  )
  const configuredColumn = useMemo(
    () => candidateColumns.find(c => c.config?.document_recipients),
    [candidateColumns]
  )

  const [recipientColumnId, setRecipientColumnId] = useState<string>(
    configuredColumn?.column_id || ''
  )
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState(defaultSubject)
  const [message, setMessage] = useState(defaultMessage)
  const [emailError, setEmailError] = useState('')

  const parsedFromColumn = useMemo(
    () => (recipientColumnId ? parseEmails(item?.data?.[recipientColumnId]) : []),
    [recipientColumnId, item]
  )

  // Prefill To whenever the source column (or the item) changes.
  useEffect(() => {
    if (recipientColumnId) {
      setTo(parsedFromColumn.join(', '))
      setEmailError('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientColumnId, item?.id])

  const handleRecipientColumnChange = (columnId: string) => {
    setRecipientColumnId(columnId)
    // Persist the choice on the column config so next time it's automatic.
    // Best-effort: ignore failures (e.g. insufficient permissions).
    const chosen = candidateColumns.find(c => c.column_id === columnId)
    if (chosen && !chosen.config?.document_recipients) {
      updateColumn
        .mutateAsync({
          columnId: chosen.id,
          updates: { config: { ...(chosen.config || {}), document_recipients: true } },
        })
        .catch(() => {})
    }
    if (configuredColumn && configuredColumn.column_id !== columnId) {
      const { document_recipients: _drop, ...rest } = configuredColumn.config || {}
      updateColumn
        .mutateAsync({ columnId: configuredColumn.id, updates: { config: rest } })
        .catch(() => {})
    }
  }

  const handleSend = () => {
    const emails = to
      .split(',')
      .map(e => e.trim())
      .filter(Boolean)

    if (emails.length === 0) {
      setEmailError('Enter at least one email address')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalid = emails.find(e => !emailRegex.test(e))
    if (invalid) {
      setEmailError(`Invalid email: ${invalid}`)
      return
    }

    setEmailError('')
    onSend(emails, subject, message || undefined)
  }

  return (
    <div className="space-y-4">
      {candidateColumns.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Recipients column{' '}
            <span className="text-text-tertiary font-normal">(auto-fills To from the item)</span>
          </label>
          <select
            value={recipientColumnId}
            onChange={e => handleRecipientColumnChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border-default rounded-md focus:ring-2 focus:ring-monday-primary focus:border-transparent text-text-primary bg-bg-primary"
          >
            <option value="">— enter manually —</option>
            {candidateColumns.map(col => (
              <option key={col.id} value={col.column_id}>
                {col.column_name_ka || col.column_name}
              </option>
            ))}
          </select>
          {recipientColumnId && parsedFromColumn.length === 0 && (
            <p className="text-xs text-orange-500 mt-1">
              No email addresses found in this column for this item — enter them manually.
            </p>
          )}
          {recipientColumnId && parsedFromColumn.length > 1 && (
            <p className="text-xs text-text-tertiary mt-1">
              {parsedFromColumn.length} addresses found — remove any you don&apos;t want below.
            </p>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          To <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={to}
          onChange={e => {
            setTo(e.target.value)
            setEmailError('')
          }}
          placeholder="email@example.com (separate multiple with commas)"
          className="w-full px-3 py-2 text-sm border border-border-default rounded-md focus:ring-2 focus:ring-monday-primary focus:border-transparent text-text-primary placeholder-text-tertiary"
        />
        {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-border-default rounded-md focus:ring-2 focus:ring-monday-primary focus:border-transparent text-text-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Message <span className="text-text-tertiary font-normal">(optional)</span>
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={3}
          placeholder="Add a message to include in the email..."
          className="w-full px-3 py-2 text-sm border border-border-default rounded-md focus:ring-2 focus:ring-monday-primary focus:border-transparent text-text-primary placeholder-text-tertiary resize-none"
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={onSkip}>
          Skip, just download
        </Button>
        <Button variant="primary" size="sm" onClick={handleSend} disabled={sending || !to.trim()}>
          {sending ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Mail className="w-4 h-4 mr-1" />
          )}
          {sending ? 'Sending...' : 'Send Email'}
        </Button>
      </div>
    </div>
  )
}
