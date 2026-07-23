// The reason to DISPLAY for a deferred/skipped stop. The officer's hand-written
// note wins over the selected enum reason ("what they wrote if they wrote it,
// otherwise what they picked"); null when there's neither.
export function deferReasonText(
  reason: string | null | undefined,
  note: string | null | undefined,
  t: (key: string) => string
): string | null {
  const written = note?.trim()
  if (written) return written
  if (reason) return t(`myWeek.reason.${reason}`)
  return null
}
