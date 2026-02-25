import React, { useState, useRef, useCallback, useEffect, memo } from 'react'
import { createPortal } from 'react-dom'

interface OverflowTooltipProps {
  text: string | undefined | null
  children: React.ReactNode
  className?: string
}

export const OverflowTooltip = memo(function OverflowTooltip({ text, children, className }: OverflowTooltipProps) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = useCallback(() => {
    const el = containerRef.current
    if (!el || !text) return
    // Only show tooltip when text is actually truncated
    if (el.scrollWidth <= el.clientWidth) return

    timeoutRef.current = setTimeout(() => {
      const rect = el.getBoundingClientRect()
      setPos({
        top: rect.top - 4,
        left: rect.left + rect.width / 2,
      })
      setShow(true)
    }, 400)
  }, [text])

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setShow(false)
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <>
      <span
        ref={containerRef}
        className={className}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </span>
      {show && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[10000] pointer-events-none"
          style={{
            top: pos.top,
            left: pos.left,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-[#323338] text-white text-xs px-2.5 py-1.5 rounded-md shadow-lg max-w-[300px] break-words leading-relaxed">
            {text}
          </div>
        </div>,
        document.body
      )}
    </>
  )
})
