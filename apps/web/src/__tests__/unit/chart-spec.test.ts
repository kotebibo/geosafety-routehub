import { describe, it, expect } from 'vitest'
import {
  parseChartSpec,
  formatChartValue,
  formatChartTick,
  MAX_CHART_POINTS,
} from '@/lib/chat/chart-spec'

describe('parseChartSpec', () => {
  it('parses a single-series line chart and infers the series', () => {
    const spec = parseChartSpec(
      '{"type":"line","title":"Revenue","currency":true,"data":[{"label":"2026-05","value":100},{"label":"2026-06","value":200}]}'
    )
    expect(spec).not.toBeNull()
    expect(spec!.type).toBe('line')
    expect(spec!.title).toBe('Revenue')
    expect(spec!.currency).toBe(true)
    expect(spec!.series).toEqual([{ key: 'value' }])
    expect(spec!.data).toHaveLength(2)
  })

  it('parses multi-series data with explicit series names', () => {
    const spec = parseChartSpec(
      JSON.stringify({
        type: 'bar',
        data: [{ label: '2026-06', expected: 5000, paid: 4200 }],
        series: [
          { key: 'expected', name: 'მოსალოდნელი' },
          { key: 'paid', name: 'გადახდილი' },
        ],
      })
    )
    expect(spec!.series).toEqual([
      { key: 'expected', name: 'მოსალოდნელი' },
      { key: 'paid', name: 'გადახდილი' },
    ])
  })

  it('returns null for partial JSON (mid-stream)', () => {
    expect(parseChartSpec('{"type":"line","data":[{"label":"a","va')).toBeNull()
  })

  it('returns null for unknown chart types and empty data', () => {
    expect(parseChartSpec('{"type":"scatter","data":[{"label":"a","value":1}]}')).toBeNull()
    expect(parseChartSpec('{"type":"bar","data":[]}')).toBeNull()
    expect(parseChartSpec('{"type":"bar"}')).toBeNull()
  })

  it('returns null when no numeric series exists', () => {
    expect(parseChartSpec('{"type":"bar","data":[{"label":"a","value":"oops"}]}')).toBeNull()
  })

  it('coerces numeric labels to strings and drops non-finite values', () => {
    const spec = parseChartSpec(
      '{"type":"bar","data":[{"label":2026,"value":10,"bad":null},{"label":"b","value":20}]}'
    )
    expect(spec!.data[0]).toEqual({ label: '2026', value: 10 })
  })

  it('keeps only the first series for pie charts', () => {
    const spec = parseChartSpec(
      '{"type":"pie","data":[{"label":"a","x":1,"y":2},{"label":"b","x":3,"y":4}]}'
    )
    expect(spec!.series).toHaveLength(1)
  })

  it('caps the number of data points', () => {
    const rows = Array.from({ length: MAX_CHART_POINTS + 40 }, (_, i) => ({
      label: `p${i}`,
      value: i,
    }))
    const spec = parseChartSpec(JSON.stringify({ type: 'line', data: rows }))
    expect(spec!.data).toHaveLength(MAX_CHART_POINTS)
  })

  it('drops declared series whose key never appears in the data', () => {
    const spec = parseChartSpec(
      '{"type":"bar","data":[{"label":"a","value":1}],"series":[{"key":"value"},{"key":"ghost"}]}'
    )
    expect(spec!.series).toEqual([{ key: 'value' }])
  })
})

describe('formatChartValue', () => {
  it('formats currency with the lari sign', () => {
    expect(formatChartValue(1234.5, true)).toBe('₾1,234.5')
    expect(formatChartValue(1234.5, false)).toBe('1,234.5')
  })
})

describe('formatChartTick', () => {
  it('compacts thousands and millions', () => {
    expect(formatChartTick(500, false)).toBe('500')
    expect(formatChartTick(12500, true)).toBe('₾13k')
    expect(formatChartTick(1500, true)).toBe('₾1.5k')
    expect(formatChartTick(2_400_000, false)).toBe('2.4M')
  })
})
