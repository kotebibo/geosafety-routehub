/**
 * useRowWindowing hook
 * Simple windowing for table rows - only renders rows near the viewport
 * Much simpler than full virtualization but effective for scroll performance
 */

import React, { useState, useEffect, useCallback, useRef, RefObject } from 'react'

const ROW_HEIGHT = 36 // Standard row height in pixels
const OVERSCAN = 20 // Number of rows to render outside visible area (buffer)

interface UseRowWindowingOptions {
  containerRef: RefObject<HTMLDivElement>
  totalRows: number
  enabled?: boolean // Set to false to disable windowing (for small datasets)
  rowHeight?: number
  overscan?: number
}

interface UseRowWindowingReturn {
  isRowVisible: (rowIndex: number, groupOffset: number) => boolean
  visibleRange: { start: number; end: number }
  scrollTop: number
}

export function useRowWindowing({
  containerRef,
  totalRows,
  enabled = true,
  rowHeight = ROW_HEIGHT,
  overscan = OVERSCAN,
}: UseRowWindowingOptions): UseRowWindowingReturn {
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)
  const rafRef = useRef<number | null>(null)

  // Calculate visible range based on scroll position
  const visibleRange = {
    start: Math.max(0, Math.floor(scrollTop / rowHeight) - overscan),
    end: Math.min(
      totalRows,
      Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
    ),
  }

  // Track scroll position with RAF throttling
  // Note: We track WINDOW scroll because the table container expands to fit content
  // and the actual scrolling happens on the window/page level
  useEffect(() => {
    const container = containerRef.current
    if (!container || !enabled) return

    const updateScroll = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      rafRef.current = requestAnimationFrame(() => {
        // Get the container's position relative to viewport
        const rect = container.getBoundingClientRect()
        // Calculate how much of the container is scrolled past the top
        // If rect.top is negative, user has scrolled down into the container
        const scrolledPast = Math.max(0, -rect.top)
        setScrollTop(scrolledPast)
      })
    }

    const updateSize = () => {
      // Use window viewport height, not container height
      setContainerHeight(window.innerHeight)
    }

    // Initial measurements
    updateSize()
    updateScroll()

    // Listen to WINDOW scroll (not container scroll)
    window.addEventListener('scroll', updateScroll, { passive: true })
    window.addEventListener('resize', updateSize)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      window.removeEventListener('scroll', updateScroll)
      window.removeEventListener('resize', updateSize)
    }
  }, [containerRef, enabled])

  // Check if a specific row is visible
  // groupOffset is the pixel offset of the group from the top of the scroll container
  const isRowVisible = useCallback(
    (rowIndex: number, groupOffset: number = 0) => {
      if (!enabled) return true // When disabled, all rows are "visible"

      // Account for headers (group header ~36px + table header ~36px)
      const HEADER_OFFSET = 80
      const rowTop = HEADER_OFFSET + groupOffset + rowIndex * rowHeight
      const rowBottom = rowTop + rowHeight
      const viewTop = scrollTop - overscan * rowHeight
      const viewBottom = scrollTop + containerHeight + overscan * rowHeight

      return rowBottom > viewTop && rowTop < viewBottom
    },
    [enabled, scrollTop, containerHeight, rowHeight, overscan]
  )

  return {
    isRowVisible,
    visibleRange,
    scrollTop,
  }
}

// Lightweight placeholder row component for non-visible rows
export function PlaceholderRow({
  height = ROW_HEIGHT,
  colSpan,
}: {
  height?: number
  colSpan: number
}) {
  return (
    <tr style={{ height }} aria-hidden="true">
      <td colSpan={colSpan} style={{ padding: 0, border: 'none' }} />
    </tr>
  )
}
