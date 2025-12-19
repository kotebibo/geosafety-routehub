import { useCallback } from 'react'

interface PopupPosition {
  top: number
  left: number
}

interface CalculatePositionOptions {
  /** The element that triggered the popup */
  triggerRect: DOMRect
  /** Approximate width of the popup (default: 200) */
  popupWidth?: number
  /** Approximate height of the popup (default: 300) */
  popupHeight?: number
  /** Margin from viewport edges (default: 8) */
  margin?: number
  /** Prefer opening above the trigger if space is limited below */
  preferAbove?: boolean
}

/**
 * Calculates optimal popup position to keep it within viewport bounds
 * Handles right edge overflow and bottom edge overflow
 */
export function calculatePopupPosition({
  triggerRect,
  popupWidth = 200,
  popupHeight = 300,
  margin = 8,
  preferAbove = false,
}: CalculatePositionOptions): PopupPosition {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  // Calculate horizontal position
  let left = triggerRect.left

  // Check if popup would overflow right edge
  if (left + popupWidth > viewportWidth - margin) {
    // Align right edge of popup with right edge of trigger, or viewport edge
    left = Math.max(margin, Math.min(
      triggerRect.right - popupWidth,
      viewportWidth - popupWidth - margin
    ))
  }

  // Ensure left doesn't go negative
  left = Math.max(margin, left)

  // Calculate vertical position
  const spaceBelow = viewportHeight - triggerRect.bottom
  const spaceAbove = triggerRect.top
  const gap = 4 // Gap between trigger and popup

  let top: number

  if (preferAbove && spaceAbove > popupHeight + margin) {
    // Open above
    top = triggerRect.top - popupHeight - gap
  } else if (spaceBelow > popupHeight + margin) {
    // Enough space below - open below
    top = triggerRect.bottom + gap
  } else if (spaceAbove > spaceBelow) {
    // More space above - open above
    top = Math.max(margin, triggerRect.top - popupHeight - gap)
  } else {
    // Open below but constrain to viewport
    top = Math.min(
      triggerRect.bottom + gap,
      viewportHeight - popupHeight - margin
    )
  }

  // Ensure top doesn't go negative
  top = Math.max(margin, top)

  return { top, left }
}

/**
 * Hook that returns a function to calculate popup position from a ref
 */
export function usePopupPosition() {
  const getPosition = useCallback((
    triggerElement: HTMLElement | null,
    options?: Omit<CalculatePositionOptions, 'triggerRect'>
  ): PopupPosition => {
    if (!triggerElement) {
      return { top: 0, left: 0 }
    }

    const triggerRect = triggerElement.getBoundingClientRect()
    return calculatePopupPosition({
      triggerRect,
      ...options,
    })
  }, [])

  return { getPosition }
}
