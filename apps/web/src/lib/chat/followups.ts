/**
 * Follow-up suggestions protocol: the model ends answers with a fenced
 * ```followups block containing a JSON array of short questions. Malformed or
 * partial content (mid-stream) returns null so the UI renders nothing.
 */

export const MAX_FOLLOWUPS = 4

export function parseFollowups(source: string): string[] | null {
  let raw: unknown
  try {
    raw = JSON.parse(source)
  } catch {
    return null
  }
  if (!Array.isArray(raw)) return null
  const questions = raw
    .filter((q): q is string => typeof q === 'string')
    .map(q => q.trim())
    .filter(q => q.length > 0 && q.length <= 200)
    .slice(0, MAX_FOLLOWUPS)
  return questions.length ? questions : null
}
