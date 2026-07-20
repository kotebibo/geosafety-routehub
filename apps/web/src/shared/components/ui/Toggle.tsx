'use client'

import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onToggle: () => void
  disabled?: boolean
}

export function Toggle({ checked, onToggle, disabled }: ToggleProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      className={cn(
        'relative w-12 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed',
        checked ? 'bg-monday-primary' : 'bg-text-disabled'
      )}
    >
      <div
        className={cn(
          'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
          checked ? 'right-1' : 'left-1'
        )}
      />
    </button>
  )
}
