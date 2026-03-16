'use client'

import { useState } from 'react'
import { Loader2, Mail } from 'lucide-react'
import { Button } from '@/shared/components/ui'

interface EmailStepProps {
  defaultSubject: string
  sending: boolean
  onSend: (to: string[], subject: string, message?: string) => void
  onSkip: () => void
}

export function EmailStep({ defaultSubject, sending, onSend, onSkip }: EmailStepProps) {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState(defaultSubject)
  const [message, setMessage] = useState('')
  const [emailError, setEmailError] = useState('')

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
