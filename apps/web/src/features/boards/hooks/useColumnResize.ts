/**
 * useColumnResize hook
 * Handles column resizing logic for the board table
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH } from '../components/BoardTable/constants'

interface UseColumnResizeOptions {
  onColumnResize?: (columnId: string, width: number) => void
  initialWidths?: Record<string, number>
}

interface UseColumnResizeReturn {
  columnWidths: Record<string, number>
  resizingColumn: string | null
  handleResizeStart: (e: React.MouseEvent, columnId: string, currentWidth: number) => void
  setColumnWidths: React.Dispatch<React.SetStateAction<Record<string, number>>>
}

export function useColumnResize({
  onColumnResize,
  initialWidths = {},
}: UseColumnResizeOptions = {}): UseColumnResizeReturn {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(initialWidths)
  const [resizingColumn, setResizingColumn] = useState<string | null>(null)
  const resizeStartX = useRef<number>(0)
  const resizeStartWidth = useRef<number>(0)

  const handleResizeStart = useCallback((e: React.MouseEvent, columnId: string, currentWidth: number) => {
    e.preventDefault()
    e.stopPropagation()
    setResizingColumn(columnId)
    resizeStartX.current = e.clientX
    resizeStartWidth.current = currentWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingColumn) return

    const delta = e.clientX - resizeStartX.current
    const newWidth = Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, resizeStartWidth.current + delta))

    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn]: newWidth
    }))
  }, [resizingColumn])

  const handleResizeEnd = useCallback(() => {
    if (resizingColumn && onColumnResize) {
      const finalWidth = columnWidths[resizingColumn]
      if (finalWidth) {
        onColumnResize(resizingColumn, finalWidth)
      }
    }
    setResizingColumn(null)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [resizingColumn, columnWidths, onColumnResize])

  // Attach/detach mouse listeners for resizing
  useEffect(() => {
    if (resizingColumn) {
      document.addEventListener('mousemove', handleResizeMove)
      document.addEventListener('mouseup', handleResizeEnd)
      return () => {
        document.removeEventListener('mousemove', handleResizeMove)
        document.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [resizingColumn, handleResizeMove, handleResizeEnd])

  return {
    columnWidths,
    resizingColumn,
    handleResizeStart,
    setColumnWidths,
  }
}
