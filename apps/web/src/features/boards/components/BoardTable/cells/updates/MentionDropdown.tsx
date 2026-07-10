'use client'

import React from 'react'

import { cn } from '@/lib/utils'
import { AtSign } from 'lucide-react'

import { getInitials } from './helpers'

import type { MentionSuggestion, UpdatesVariant } from './types'

interface MentionDropdownProps {
  variant: UpdatesVariant
  suggestions: MentionSuggestion[]
  activeIndex: number
  onSelect: (suggestion: MentionSuggestion) => void
  listRef: React.RefObject<HTMLDivElement>
}

export function MentionDropdown({
  variant,
  suggestions,
  activeIndex,
  onSelect,
  listRef,
}: MentionDropdownProps) {
  const isPanel = variant === 'panel'

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-4 right-4 mb-2 bg-bg-primary rounded-lg shadow-lg border border-border-light overflow-hidden z-10"
    >
      <div className="px-3 py-2 text-xs font-medium text-text-secondary bg-bg-secondary border-b border-border-light">
        <AtSign className="w-3 h-3 inline mr-1" />
        Mention someone
      </div>
      {suggestions.map((suggestion, index) => (
        <button
          key={suggestion.id}
          onClick={() => onSelect(suggestion)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
            index === activeIndex ? 'bg-bg-selected' : 'hover:bg-bg-hover'
          )}
        >
          <div
            className={cn(
              'rounded-full bg-monday-primary flex items-center justify-center',
              isPanel ? 'w-7 h-7' : 'w-8 h-8'
            )}
          >
            <span
              className={cn('font-semibold text-text-inverse', isPanel ? 'text-[10px]' : 'text-xs')}
            >
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
  )
}
