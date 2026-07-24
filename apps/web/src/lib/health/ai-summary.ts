/**
 * Compacts a health snapshot + persisted history into a small plain-text block
 * for the AI analysis prompt. Pure — no I/O — so it is unit-testable and the
 * API route stays thin.
 */

export interface HealthCheckResult {
  name: string
  status: 'ok' | 'slow' | 'error'
  time_ms: number
  result?: unknown
  error?: string
}

export interface HealthSnapshot {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: HealthCheckResult[]
  summary: { total: number; ok: number; slow: number; failed: number }
}

export interface HealthHistoryRow {
  status: string
  avg_ms: number
  max_ms: number
  checks: { name: string; status: string; time_ms: number }[]
  created_at: string
}

function round(n: number): number {
  return Math.round(n)
}

/** Per-check mean latency and error count across history rows. */
function checkBaselines(history: HealthHistoryRow[]) {
  const acc = new Map<string, { total: number; count: number; errors: number }>()
  for (const row of history) {
    for (const check of row.checks || []) {
      const entry = acc.get(check.name) || { total: 0, count: 0, errors: 0 }
      entry.total += check.time_ms
      entry.count++
      if (check.status === 'error') entry.errors++
      acc.set(check.name, entry)
    }
  }
  return acc
}

export function summarizeHealthForAI(current: HealthSnapshot, history: HealthHistoryRow[]): string {
  const lines: string[] = []

  lines.push(
    `CURRENT SNAPSHOT (${current.timestamp}): overall=${current.status}; ` +
      `${current.summary.total} checks — ${current.summary.ok} ok, ${current.summary.slow} slow, ${current.summary.failed} failed`
  )
  const baselines = checkBaselines(history)
  for (const check of current.checks) {
    const baseline = baselines.get(check.name)
    const baselinePart = baseline
      ? ` (baseline avg ${round(baseline.total / baseline.count)}ms over ${baseline.count} samples${
          baseline.errors ? `, ${baseline.errors} past errors` : ''
        })`
      : ''
    const errorPart = check.error ? ` — error: ${check.error}` : ''
    lines.push(`- ${check.name}: ${check.status} ${check.time_ms}ms${baselinePart}${errorPart}`)
  }

  if (history.length === 0) {
    lines.push('HISTORY: no persisted samples in the selected window.')
    return lines.join('\n')
  }

  const statusCounts = { healthy: 0, degraded: 0, unhealthy: 0 }
  for (const row of history) {
    if (row.status in statusCounts) statusCounts[row.status as keyof typeof statusCounts]++
  }
  const avgValues = history.map(r => r.avg_ms)
  const maxValues = history.map(r => r.max_ms)
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  const from = history[0].created_at
  const to = history[history.length - 1].created_at

  lines.push(
    `HISTORY (${history.length} samples, ${from} → ${to}): ` +
      `${statusCounts.healthy} healthy / ${statusCounts.degraded} degraded / ${statusCounts.unhealthy} unhealthy; ` +
      `avg latency mean ${round(mean(avgValues))}ms (min ${Math.min(...avgValues)}, max ${Math.max(...avgValues)}); ` +
      `max latency mean ${round(mean(maxValues))}ms (peak ${Math.max(...maxValues)})`
  )

  const incidents = history.filter(r => r.status !== 'healthy').slice(-5)
  if (incidents.length) {
    lines.push(
      'RECENT NON-HEALTHY SAMPLES: ' +
        incidents
          .map(r => {
            const bad = (r.checks || [])
              .filter(c => c.status !== 'ok')
              .map(c => `${c.name} ${c.status} ${c.time_ms}ms`)
              .join(', ')
            return `${r.created_at} ${r.status}${bad ? ` [${bad}]` : ''}`
          })
          .join('; ')
    )
  }

  return lines.join('\n')
}
