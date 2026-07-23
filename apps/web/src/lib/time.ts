// Single source of truth for "now" in Georgia time (UTC+4, no DST).
//
// All routing day/week decisions — check-in day gate, week/month analytics
// bucketing, auto-defer cutoff, "which week is next" — must resolve the current
// day on the SERVER, never from the client device clock (which the user can
// change). Server code calls these directly; the client reads them via
// GET /api/time so a wrong or drifting device clock can't shift days.

export const GEORGIA_OFFSET_MS = 4 * 60 * 60 * 1000

function toMs(input?: string | number | Date): number {
  if (input == null) return Date.now()
  if (typeof input === 'number') return input
  if (input instanceof Date) return input.getTime()
  return new Date(input).getTime()
}

/** Shift a UTC instant into Georgia local, as a Date whose UTC fields read local. */
function shifted(ms: number): Date {
  return new Date(ms + GEORGIA_OFFSET_MS)
}

/** Georgia calendar date (YYYY-MM-DD) for an instant (defaults to now). */
export function georgiaDateOf(input?: string | number | Date): string {
  return shifted(toMs(input)).toISOString().slice(0, 10)
}

/** Today in Georgia (YYYY-MM-DD). */
export function georgiaToday(): string {
  return georgiaDateOf()
}

/** Georgia wall-clock time of day (HH:MM:SS) for an instant (defaults to now). */
export function georgiaTimeOfDay(input?: string | number | Date): string {
  return shifted(toMs(input)).toISOString().slice(11, 19)
}

/** Monday (YYYY-MM-DD) of the Georgia week, offset by whole weeks (0 = this). */
export function georgiaMonday(offsetWeeks = 0): string {
  const now = shifted(Date.now())
  const dow = (now.getUTCDay() + 6) % 7 // Mon=0 … Sun=6
  const mondayMs = now.getTime() - dow * 86400000 + offsetWeeks * 7 * 86400000
  return new Date(mondayMs).toISOString().slice(0, 10)
}

/** Monday (YYYY-MM-DD) of the Georgia week containing an arbitrary date. */
export function georgiaMondayOfDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const dow = (dt.getUTCDay() + 6) % 7
  return new Date(dt.getTime() - dow * 86400000).toISOString().slice(0, 10)
}

/**
 * A timestamptz-safe range [start, end] literal pair that bounds a span of
 * Georgia calendar days in UTC — for querying `created_at` (stored UTC) by
 * Georgia day without per-row math. Both bounds carry the +04:00 offset.
 */
export function georgiaDayRange(fromDate: string, toDate: string): { gte: string; lte: string } {
  return { gte: `${fromDate}T00:00:00+04:00`, lte: `${toDate}T23:59:59.999+04:00` }
}
