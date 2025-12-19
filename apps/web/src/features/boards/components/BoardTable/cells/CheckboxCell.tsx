'use client'

import React, { memo } from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface CheckboxCellProps {
  value?: boolean | null
  onEdit?: (value: boolean) => void
  readOnly?: boolean
  onEditStart?: () => void
}

export const CheckboxCell = memo(function CheckboxCell({ value, onEdit, readOnly = false, onEditStart }: CheckboxCellProps) {
  const isChecked = Boolean(value)

  const handleToggle = () => {
    if (!readOnly && onEdit) {
      onEditStart?.()
      onEdit(!isChecked)
    }
  }

  return (
    <div className="h-full min-h-[36px] flex items-center justify-center">
      <button
        onClick={handleToggle}
        disabled={readOnly}
        className={cn(
          'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
          isChecked
            ? 'bg-[#00c875] border-[#00c875]'
            : 'bg-white border-[#c3c6d4] hover:border-[#00c875]',
          readOnly && 'cursor-default opacity-70',
          !readOnly && 'cursor-pointer'
        )}
      >
        {isChecked && (
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        )}
      </button>
    </div>
  )
})
