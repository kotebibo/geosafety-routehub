import { describe, it, expect } from 'vitest'
import {
  summarizeHealthForAI,
  type HealthSnapshot,
  type HealthHistoryRow,
} from '@/lib/health/ai-summary'

const snapshot: HealthSnapshot = {
  status: 'degraded',
  timestamp: '2026-07-24T10:00:00.000Z',
  checks: [
    { name: 'db_ping', status: 'ok', time_ms: 120, result: 'pong' },
    { name: 'auth_latency', status: 'slow', time_ms: 2400, result: '2400ms' },
    { name: 'storage', status: 'error', time_ms: 512, result: null, error: 'timeout' },
  ],
  summary: { total: 3, ok: 1, slow: 1, failed: 1 },
}

const history: HealthHistoryRow[] = [
  {
    status: 'healthy',
    avg_ms: 150,
    max_ms: 300,
    checks: [
      { name: 'db_ping', status: 'ok', time_ms: 100 },
      { name: 'auth_latency', status: 'ok', time_ms: 200 },
    ],
    created_at: '2026-07-24T08:00:00.000Z',
  },
  {
    status: 'unhealthy',
    avg_ms: 450,
    max_ms: 5000,
    checks: [
      { name: 'db_ping', status: 'ok', time_ms: 140 },
      { name: 'auth_latency', status: 'error', time_ms: 5000 },
    ],
    created_at: '2026-07-24T09:00:00.000Z',
  },
]

describe('summarizeHealthForAI', () => {
  it('includes overall status, per-check lines and errors', () => {
    const text = summarizeHealthForAI(snapshot, history)
    expect(text).toContain('overall=degraded')
    expect(text).toContain('3 checks — 1 ok, 1 slow, 1 failed')
    expect(text).toContain('- storage: error 512ms')
    expect(text).toContain('error: timeout')
  })

  it('computes per-check baselines from history', () => {
    const text = summarizeHealthForAI(snapshot, history)
    // db_ping: (100 + 140) / 2 = 120
    expect(text).toContain('- db_ping: ok 120ms (baseline avg 120ms over 2 samples)')
    // auth_latency: (200 + 5000) / 2 = 2600, with one past error
    expect(text).toContain('(baseline avg 2600ms over 2 samples, 1 past errors)')
  })

  it('summarizes history status distribution and latency range', () => {
    const text = summarizeHealthForAI(snapshot, history)
    expect(text).toContain('HISTORY (2 samples')
    expect(text).toContain('1 healthy / 0 degraded / 1 unhealthy')
    expect(text).toContain('avg latency mean 300ms (min 150, max 450)')
  })

  it('lists recent non-healthy samples with their failing checks', () => {
    const text = summarizeHealthForAI(snapshot, history)
    expect(text).toContain('RECENT NON-HEALTHY SAMPLES:')
    expect(text).toContain('2026-07-24T09:00:00.000Z unhealthy [auth_latency error 5000ms]')
  })

  it('handles empty history without crashing', () => {
    const text = summarizeHealthForAI(snapshot, [])
    expect(text).toContain('HISTORY: no persisted samples')
    expect(text).not.toContain('baseline')
  })
})
