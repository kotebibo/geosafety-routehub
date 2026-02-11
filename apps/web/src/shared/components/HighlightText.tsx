import React, { memo, useMemo } from 'react'

interface HighlightTextProps {
  text: string
  query: string
  className?: string
  highlightClassName?: string
}

/**
 * Renders text with matching portions highlighted.
 * Used in global search results to show which parts of a cell value matched the query.
 */
export const HighlightText = memo(function HighlightText({
  text,
  query,
  className,
  highlightClassName = 'bg-yellow-200/60 text-inherit rounded-sm',
}: HighlightTextProps) {
  const parts = useMemo(() => {
    if (!query || query.length < 2) return [{ text, highlight: false }]

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escaped})`, 'gi')
    const segments: { text: string; highlight: boolean }[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ text: text.slice(lastIndex, match.index), highlight: false })
      }
      segments.push({ text: match[1], highlight: true })
      lastIndex = regex.lastIndex
    }

    if (lastIndex < text.length) {
      segments.push({ text: text.slice(lastIndex), highlight: false })
    }

    return segments.length > 0 ? segments : [{ text, highlight: false }]
  }, [text, query])

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.highlight ? (
          <mark key={i} className={highlightClassName}>{part.text}</mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </span>
  )
})
