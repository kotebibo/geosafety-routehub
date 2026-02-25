import { memo, useMemo, useState, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { MONDAY_COLORS, getColorInfo, DEFAULT_STATUS_OPTIONS, type StatusOption } from './StatusCell'
import type { BoardColumn } from '@/types/board'
import type { BoardItem } from '../../../types/board'

interface SummaryCellProps {
  column: BoardColumn
  items: BoardItem[]
}

export function SummaryCell({ column, items }: SummaryCellProps) {
  switch (column.column_type) {
    case 'number':
      return <NumberSummaryCell items={items} column={column} />
    case 'status':
      return <StatusSummaryCell items={items} column={column} />
    default:
      return null
  }
}

// ==================== Number Summary ====================

interface NumberSummaryCellProps {
  items: BoardItem[]
  column: BoardColumn
}

const NumberSummaryCell = memo(function NumberSummaryCell({
  items,
  column,
}: NumberSummaryCellProps) {
  const sum = useMemo(() => {
    let total = 0
    let hasValue = false
    for (const item of items) {
      const val = item.data?.[column.column_id]
      const num = typeof val === 'number' ? val : parseFloat(val)
      if (!isNaN(num)) {
        total += num
        hasValue = true
      }
    }
    return hasValue ? total : null
  }, [items, column.column_id])

  if (sum === null) return null

  const config = column.config || {}
  let formatted: string
  if (config.format === 'currency') {
    formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: config.currency || 'USD',
    }).format(sum)
  } else if (config.format === 'percentage') {
    formatted = `${sum}%`
  } else {
    formatted = new Intl.NumberFormat('en-US').format(sum)
  }

  return (
    <div className="w-full h-full px-2 flex items-center justify-end text-xs font-semibold text-[#323338]">
      {formatted}
    </div>
  )
})

// ==================== Status Summary ====================

interface StatusSummaryCellProps {
  items: BoardItem[]
  column: BoardColumn
}

interface StatusSegment {
  key: string
  label: string
  count: number
  percentage: number
  hex: string
}

const StatusSummaryCell = memo(function StatusSummaryCell({
  items,
  column,
}: StatusSummaryCellProps) {
  const [isHovered, setIsHovered] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (isHovered && barRef.current) {
      const rect = barRef.current.getBoundingClientRect()
      setTooltipPos({
        top: rect.top - 8, // above the bar, the tooltip will use bottom anchor
        left: rect.left + rect.width / 2,
      })
    }
  }, [isHovered])

  const distribution = useMemo(() => {
    // Resolve status options from column config
    let statusOptions: StatusOption[] = DEFAULT_STATUS_OPTIONS
    if (column.config?.options) {
      if (Array.isArray(column.config.options)) {
        statusOptions = column.config.options.map((opt: any) => ({
          key: opt.key || opt.label?.toLowerCase().replace(/\s+/g, '_') || '',
          label: opt.label || opt.key || '',
          color: opt.color || 'explosive',
        }))
      } else {
        statusOptions = Object.entries(column.config.options).map(
          ([key, opt]: [string, any]) => ({
            key,
            label: opt.label || key,
            color: opt.color || 'explosive',
          })
        )
      }
    }

    // Count occurrences of each status
    const counts = new Map<string, number>()
    for (const item of items) {
      const statusKey = (item.data?.[column.column_id] as string) || ''
      if (statusKey) {
        counts.set(statusKey, (counts.get(statusKey) || 0) + 1)
      }
    }

    const total = items.length
    if (total === 0) return []

    // Build segments from options that have items
    const segments: StatusSegment[] = []
    for (const opt of statusOptions) {
      const count = counts.get(opt.key) || 0
      if (count > 0) {
        const colorInfo = getColorInfo(opt.color)
        segments.push({
          key: opt.key,
          label: opt.label,
          count,
          percentage: Math.round((count / total) * 100),
          hex: colorInfo.hex,
        })
      }
    }

    // Handle items with status keys not in options (catch-all)
    let accounted = 0
    for (const seg of segments) accounted += seg.count
    const unaccounted = total - accounted
    if (unaccounted > 0) {
      segments.push({
        key: '__other',
        label: 'Other',
        count: unaccounted,
        percentage: Math.round((unaccounted / total) * 100),
        hex: MONDAY_COLORS.explosive.hex,
      })
    }

    return segments
  }, [items, column])

  if (distribution.length === 0) return null

  const total = items.length

  return (
    <div
      ref={barRef}
      className="w-full h-full px-1.5 flex items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="w-full h-4 rounded-sm overflow-hidden flex">
        {distribution.map((segment) => (
          <div
            key={segment.key}
            className="h-full"
            style={{
              width: `${segment.percentage}%`,
              backgroundColor: segment.hex,
              minWidth: segment.percentage > 0 ? '2px' : '0px',
            }}
          />
        ))}
      </div>

      {/* Detailed breakdown popup - portaled */}
      {isHovered && createPortal(
        <div
          style={{ top: tooltipPos.top, left: tooltipPos.left, transform: 'translate(-50%, -100%)' }}
          className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-[#e6e9ef] pointer-events-none min-w-[200px]"
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-[#e6e9ef]">
            <span className="text-xs font-semibold text-[#323338]">{column.column_name}</span>
            <span className="text-xs text-[#676879] ml-1">({total} items)</span>
          </div>
          {/* Segments */}
          <div className="px-3 py-1.5">
            {distribution.map((segment) => (
              <div key={segment.key} className="flex items-center gap-2 py-1">
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: segment.hex }}
                />
                <span className="text-xs text-[#323338] flex-1 truncate">{segment.label}</span>
                <span className="text-xs font-medium text-[#323338] tabular-nums">{segment.count}</span>
                <span className="text-xs text-[#676879] tabular-nums w-9 text-right">{segment.percentage}%</span>
              </div>
            ))}
          </div>
          {/* Bar preview at bottom */}
          <div className="px-3 pb-2 pt-1">
            <div className="w-full h-2 rounded-full overflow-hidden flex">
              {distribution.map((segment) => (
                <div
                  key={segment.key}
                  className="h-full"
                  style={{
                    width: `${segment.percentage}%`,
                    backgroundColor: segment.hex,
                    minWidth: segment.percentage > 0 ? '2px' : '0px',
                  }}
                />
              ))}
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white drop-shadow-sm" />
        </div>,
        document.body
      )}
    </div>
  )
})
