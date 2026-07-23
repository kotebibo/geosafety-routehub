/** Monday of the current week, shifted by `weekOffset` weeks. Local time. */
export function mondayOf(weekOffset: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const dow = (d.getDay() + 6) % 7 // 0 = Monday
  d.setDate(d.getDate() - dow + weekOffset * 7)
  return d
}

/** The 7 dates (Mon–Sun) of the week starting at `monday`. */
export function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

/** Stable per-day key (YYYY-MM-DD, local). */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const DAY_LABELS_KA = ['ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვ']

/** Monday (YYYY-MM-DD) of the week containing the given YYYY-MM-DD date. */
export function weekStartOf(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const dow = (dt.getDay() + 6) % 7 // 0 = Monday
  dt.setDate(dt.getDate() - dow)
  return dayKey(dt)
}

/** Day-of-week label (ორშ–კვ) for a YYYY-MM-DD date. */
export function dayLabelOf(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7
  return DAY_LABELS_KA[dow]
}

/** Add `days` to a YYYY-MM-DD date, returning a YYYY-MM-DD string. */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  return dayKey(dt)
}

export function shortDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** "DD.MM" for a YYYY-MM-DD string (the string counterpart to shortDate). */
export function shortDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return shortDate(new Date(y, m - 1, d))
}
