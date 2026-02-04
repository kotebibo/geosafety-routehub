/**
 * useTableScrollbar hook
 * Handles custom scrollbar logic for the board table
 */

import { useState, useRef, useCallback, useEffect, RefObject } from 'react'

interface ScrollInfo {
  scrollLeft: number
  scrollWidth: number
  clientWidth: number
}

interface ScrollbarPosition {
  left: number
  width: number
  bottom: number
}

interface UseTableScrollbarOptions {
  tableContainerRef: RefObject<HTMLDivElement>
}

interface UseTableScrollbarReturn {
  scrollbarRef: RefObject<HTMLDivElement>
  scrollbarThumbRef: RefObject<HTMLDivElement>
  scrollInfo: ScrollInfo
  scrollbarPosition: ScrollbarPosition
  isDraggingScrollbar: boolean
  handleScrollbarMouseDown: (e: React.MouseEvent) => void
  handleTrackClick: (e: React.MouseEvent) => void
  showScrollbar: boolean
}

export function useTableScrollbar({
  tableContainerRef,
}: UseTableScrollbarOptions): UseTableScrollbarReturn {
  const scrollbarRef = useRef<HTMLDivElement>(null)
  const scrollbarThumbRef = useRef<HTMLDivElement>(null)

  const [scrollInfo, setScrollInfo] = useState<ScrollInfo>({ scrollLeft: 0, scrollWidth: 0, clientWidth: 0 })
  const [isDraggingScrollbar, setIsDraggingScrollbar] = useState(false)
  const [scrollbarPosition, setScrollbarPosition] = useState<ScrollbarPosition>({ left: 0, width: 0, bottom: 0 })
  const scrollbarDragStartX = useRef(0)
  const scrollbarDragStartScrollLeft = useRef(0)

  // Track RAF frame to prevent multiple updates per frame
  const rafRef = useRef<number | null>(null)
  const lastScrollLeftRef = useRef<number>(0)

  // Update scroll info and scrollbar position when table scrolls or resizes
  useEffect(() => {
    const container = tableContainerRef.current
    if (!container) return

    // Lightweight scroll handler - only updates scrollLeft, uses RAF for batching
    const handleScroll = () => {
      // Skip if scrollLeft hasn't changed (vertical scroll)
      if (container.scrollLeft === lastScrollLeftRef.current) return
      lastScrollLeftRef.current = container.scrollLeft

      // Cancel any pending RAF to avoid stacking
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }

      // Batch the state update with RAF
      rafRef.current = requestAnimationFrame(() => {
        setScrollInfo(prev => {
          // Only update if values changed
          if (prev.scrollLeft === container.scrollLeft &&
              prev.scrollWidth === container.scrollWidth &&
              prev.clientWidth === container.clientWidth) {
            return prev
          }
          return {
            scrollLeft: container.scrollLeft,
            scrollWidth: container.scrollWidth,
            clientWidth: container.clientWidth,
          }
        })
      })
    }

    // Full update including position - only needed on resize/window scroll
    const updateScrollbarPosition = () => {
      const rect = container.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const bottom = Math.max(0, viewportHeight - rect.bottom)

      setScrollbarPosition({
        left: rect.left,
        width: rect.width,
        bottom: bottom,
      })

      // Also update scroll info
      setScrollInfo({
        scrollLeft: container.scrollLeft,
        scrollWidth: container.scrollWidth,
        clientWidth: container.clientWidth,
      })
    }

    // Initial update
    updateScrollbarPosition()

    // Scroll only needs lightweight handler
    container.addEventListener('scroll', handleScroll, { passive: true })

    // Window scroll/resize needs full position update
    window.addEventListener('scroll', updateScrollbarPosition, true)
    window.addEventListener('resize', updateScrollbarPosition)

    // Use ResizeObserver to detect container size changes
    const resizeObserver = new ResizeObserver(updateScrollbarPosition)
    resizeObserver.observe(container)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      container.removeEventListener('scroll', handleScroll)
      window.removeEventListener('scroll', updateScrollbarPosition, true)
      window.removeEventListener('resize', updateScrollbarPosition)
      resizeObserver.disconnect()
    }
  }, [tableContainerRef])

  // Handle custom scrollbar drag
  const handleScrollbarMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingScrollbar(true)
    scrollbarDragStartX.current = e.clientX
    scrollbarDragStartScrollLeft.current = tableContainerRef.current?.scrollLeft || 0
    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'
  }, [tableContainerRef])

  const handleScrollbarMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingScrollbar || !tableContainerRef.current) return

    const container = tableContainerRef.current
    const scrollableWidth = container.scrollWidth - container.clientWidth
    const trackWidth = scrollbarRef.current?.clientWidth || container.clientWidth
    const thumbWidth = Math.max(50, (container.clientWidth / container.scrollWidth) * trackWidth)
    const availableTrackWidth = trackWidth - thumbWidth

    const deltaX = e.clientX - scrollbarDragStartX.current
    const scrollRatio = deltaX / availableTrackWidth
    const newScrollLeft = scrollbarDragStartScrollLeft.current + scrollRatio * scrollableWidth

    container.scrollLeft = Math.max(0, Math.min(scrollableWidth, newScrollLeft))
  }, [isDraggingScrollbar, tableContainerRef])

  const handleScrollbarMouseUp = useCallback(() => {
    setIsDraggingScrollbar(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  // Attach/detach scrollbar drag listeners
  useEffect(() => {
    if (isDraggingScrollbar) {
      document.addEventListener('mousemove', handleScrollbarMouseMove)
      document.addEventListener('mouseup', handleScrollbarMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleScrollbarMouseMove)
        document.removeEventListener('mouseup', handleScrollbarMouseUp)
      }
    }
  }, [isDraggingScrollbar, handleScrollbarMouseMove, handleScrollbarMouseUp])

  // Handle click on scrollbar track
  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    if (!tableContainerRef.current || !scrollbarRef.current) return
    // Only handle clicks on the track itself, not the thumb
    if (e.target !== scrollbarRef.current) return

    const container = tableContainerRef.current
    const trackRect = scrollbarRef.current.getBoundingClientRect()
    const clickPosition = e.clientX - trackRect.left
    const trackWidth = trackRect.width
    const scrollableWidth = container.scrollWidth - container.clientWidth

    // Calculate where to scroll based on click position
    const scrollRatio = clickPosition / trackWidth
    const newScrollLeft = scrollRatio * container.scrollWidth - container.clientWidth / 2

    container.scrollLeft = Math.max(0, Math.min(scrollableWidth, newScrollLeft))
  }, [tableContainerRef])

  // Calculate if scrollbar should be visible
  const showScrollbar = scrollInfo.scrollWidth > scrollInfo.clientWidth

  return {
    scrollbarRef,
    scrollbarThumbRef,
    scrollInfo,
    scrollbarPosition,
    isDraggingScrollbar,
    handleScrollbarMouseDown,
    handleTrackClick,
    showScrollbar,
  }
}
