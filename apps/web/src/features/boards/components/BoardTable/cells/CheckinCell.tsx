'use client'

import React, { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useCheckinSummary } from '@/features/boards/contexts/CheckinSummaryContext'
import { formatDuration } from '@/lib/geo-utils'
import { CheckinBottomSheet } from './CheckinBottomSheet'
import type { BoardColumn } from '@/types/board'

interface CheckinCellProps {
  value?: any
  row?: Record<string, any>
  column?: BoardColumn
  onEditStart?: () => void
}

export function CheckinCell({ row, column, onEditStart }: CheckinCellProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const summary = useCheckinSummary(row?.id ?? '')

  const handleClick = () => {
    onEditStart?.()
    setSheetOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="h-full min-h-[36px] w-full flex items-center gap-2 px-3 hover:bg-bg-hover transition-colors cursor-pointer"
      >
        {!summary ? (
          <span className="text-text-tertiary text-sm">-</span>
        ) : summary.has_active ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            აქტიური
          </span>
        ) : (
          <>
            {summary.latest_location_match === true && (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
            )}
            {summary.latest_location_match === false && (
              <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            )}
            {summary.latest_duration_minutes != null && (
              <span className="text-sm text-text-primary truncate">
                {formatDuration(summary.latest_duration_minutes)}
              </span>
            )}
            {summary.checkin_count > 1 && (
              <span className="text-xs text-text-tertiary flex-shrink-0">
                ({summary.checkin_count})
              </span>
            )}
          </>
        )}
      </button>

      {sheetOpen && row && column && (
        <CheckinBottomSheet
          itemId={row.id}
          itemName={row.name || 'Unnamed'}
          boardId={row.board_id}
          column={column}
          row={row}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  )
}
