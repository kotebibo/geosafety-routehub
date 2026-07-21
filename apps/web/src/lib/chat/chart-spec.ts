/**
 * Chart spec protocol for AI assistant responses.
 *
 * The model emits a fenced ```chart code block containing JSON. This module
 * validates that JSON into a renderable spec — anything malformed returns null
 * so the UI can fall back gracefully (partial JSON while streaming is normal).
 */

export interface ChartSeries {
  key: string
  name?: string
}

export interface ChartDataRow {
  label: string
  [key: string]: string | number
}

export interface ChartSpec {
  type: 'bar' | 'line' | 'pie'
  title?: string
  currency: boolean
  data: ChartDataRow[]
  series: ChartSeries[]
}

/** Hard cap so a runaway model can't render thousands of points. */
export const MAX_CHART_POINTS = 60

export function parseChartSpec(source: string): ChartSpec | null {
  let raw: unknown
  try {
    raw = JSON.parse(source)
  } catch {
    return null
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const spec = raw as Record<string, unknown>

  if (spec.type !== 'bar' && spec.type !== 'line' && spec.type !== 'pie') return null
  if (!Array.isArray(spec.data) || spec.data.length === 0) return null

  const data: ChartDataRow[] = []
  for (const row of spec.data.slice(0, MAX_CHART_POINTS)) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return null
    const record = row as Record<string, unknown>
    if (typeof record.label !== 'string' && typeof record.label !== 'number') return null
    const clean: ChartDataRow = { label: String(record.label) }
    for (const [key, value] of Object.entries(record)) {
      if (key === 'label') continue
      if (typeof value === 'number' && Number.isFinite(value)) clean[key] = value
    }
    data.push(clean)
  }

  let series: ChartSeries[] = []
  if (Array.isArray(spec.series)) {
    for (const entry of spec.series) {
      if (entry && typeof entry === 'object' && typeof (entry as ChartSeries).key === 'string') {
        const { key, name } = entry as ChartSeries
        series.push({ key, name: typeof name === 'string' ? name : undefined })
      }
    }
  }
  if (series.length === 0) {
    series = Object.keys(data[0])
      .filter(key => key !== 'label' && typeof data[0][key] === 'number')
      .map(key => ({ key }))
  }
  series = series.filter(s => data.some(row => typeof row[s.key] === 'number'))
  if (series.length === 0) return null
  if (spec.type === 'pie') series = series.slice(0, 1)

  return {
    type: spec.type,
    title: typeof spec.title === 'string' ? spec.title : undefined,
    currency: spec.currency === true,
    data,
    series,
  }
}

export function formatChartValue(value: number, currency: boolean): string {
  const formatted = value.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return currency ? `₾${formatted}` : formatted
}

/** Compact axis-tick label: ₾12.5k instead of ₾12,500. */
export function formatChartTick(value: number, currency: boolean): string {
  const abs = Math.abs(value)
  const compact =
    abs >= 1_000_000
      ? `${(value / 1_000_000).toFixed(1)}M`
      : abs >= 1_000
        ? `${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`
        : `${value}`
  return currency ? `₾${compact}` : compact
}
