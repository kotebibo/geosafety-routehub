'use client'

import React, { useState, useRef, useCallback } from 'react'

import { useUsers } from '@/hooks/useUsers'

import type { MentionSuggestion } from './types'

interface UseMentionsOptions {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  inputRef: React.RefObject<HTMLTextAreaElement>
}

export function useMentions({ value, onChange, onSubmit, inputRef }: UseMentionsOptions) {
  const { users } = useUsers()

  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [selectedMentions, setSelectedMentions] = useState<string[]>([])

  const mentionListRef = useRef<HTMLDivElement>(null)

  // Filter users for mention suggestions
  const mentionSuggestions: MentionSuggestion[] =
    users
      ?.filter(u => {
        const name = (u.full_name || '').toLowerCase()
        const email = (u.email || '').toLowerCase()
        const search = mentionSearch.toLowerCase()
        return name.includes(search) || email.includes(search)
      })
      .map(u => ({
        id: u.id,
        name: u.full_name || 'Unknown',
        email: u.email,
      }))
      .slice(0, 5) || []

  // Handle text input changes for @mention detection
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const position = e.target.selectionStart || 0
    onChange(newValue)
    setCursorPosition(position)

    // Check for @ mention trigger
    const textBeforeCursor = newValue.slice(0, position)
    const mentionMatch = textBeforeCursor.match(/@([\p{L}\p{N}_]*)$/u)

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
      const textBeforeCursor = value.slice(0, cursorPosition)
      const textAfterCursor = value.slice(cursorPosition)

      // Find and replace the @mention trigger
      const mentionMatch = textBeforeCursor.match(/@([\p{L}\p{N}_]*)$/u)
      if (mentionMatch) {
        const beforeMention = textBeforeCursor.slice(0, mentionMatch.index)
        const newText = `${beforeMention}@${suggestion.name} ${textAfterCursor}`
        onChange(newText)
        setSelectedMentions([...selectedMentions, suggestion.id])
      }

      setShowMentions(false)
      setMentionSearch('')
      inputRef.current?.focus()
    },
    [value, cursorPosition, selectedMentions, onChange, inputRef]
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
      onSubmit()
    }
  }

  const clearSelectedMentions = () => setSelectedMentions([])

  return {
    showMentions,
    mentionIndex,
    mentionSuggestions,
    selectedMentions,
    clearSelectedMentions,
    mentionListRef,
    handleInputChange,
    handleKeyDown,
    insertMention,
  }
}
