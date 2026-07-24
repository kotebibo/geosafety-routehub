'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { HealthAiAnalysis } from '@/features/health/components/HealthAiAnalysis'
import {
  Activity,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Server,
  TrendingUp,
  Shield,
  Zap,
  HardDrive,
  Globe,
  History,
  Calendar,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts'

interface HealthCheck {
  name: string
  status: 'ok' | 'slow' | 'error'
  time_ms: number
  result?: any
  error?: string
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: HealthCheck[]
  summary: { total: number; ok: number; slow: number; failed: number }
}

interface HistoryEntry {
  timestamp: string
  label: string
  status: string
  avg_ms: number
  max_ms: number
  checks: HealthCheck[]
}

interface PersistedLog {
  id: string
  status: string
  avg_ms: number
  max_ms: number
  checks: { name: string; status: string; time_ms: number }[]
  region: string
  created_at: string
}

type HistoryRange = '1h' | '24h' | '7d' | '30d'

const CHECK_LABELS: Record<string, string> = {
  db_ping: 'DB Ping',
  boards_count: 'Boards',
  board_items_count: 'Board Items',
  bank_transactions_count: 'Transactions',
  active_inspectors: 'Inspectors',
  users_count: 'Users',
  recent_checkins: 'Checkins (24h)',
  auth_latency: 'Auth Latency',
  rls_query: 'RLS Query',
  storage: 'Storage',
  team2_ping: 'Team 2 DB',
  team3_ping: 'Team 3 DB',
}

const CHECK_ICONS: Record<string, typeof Database> = {
  db_ping: Zap,
  auth_latency: Shield,
  rls_query: Shield,
  storage: HardDrive,
  team2_ping: Globe,
  team3_ping: Globe,
}

const STATUS_CONFIG = {
  healthy: {
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    icon: CheckCircle2,
    label: 'Healthy',
  },
  degraded: {
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    icon: AlertTriangle,
    label: 'Degraded',
  },
  unhealthy: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: XCircle,
    label: 'Unhealthy',
  },
}

const BAR_COLORS = {
  ok: '#22c55e',
  slow: '#eab308',
  error: '#ef4444',
}

// Group checks by category for better display
function groupChecks(checks: HealthCheck[]) {
  const groups: Record<string, HealthCheck[]> = {
    performance: [],
    data: [],
    infrastructure: [],
  }
  for (const check of checks) {
    if (['db_ping', 'auth_latency', 'rls_query'].includes(check.name)) {
      groups.performance.push(check)
    } else if (['team2_ping', 'team3_ping', 'storage'].includes(check.name)) {
      groups.infrastructure.push(check)
    } else {
      groups.data.push(check)
    }
  }
  return groups
}

const GROUP_LABELS: Record<string, { label: string; icon: typeof Database }> = {
  performance: { label: 'Performance', icon: Zap },
  data: { label: 'Data', icon: Database },
  infrastructure: { label: 'Infrastructure', icon: Server },
}

export default function HealthPage() {
  const { userRole } = useAuth()
  const [current, setCurrent] = useState<HealthResponse | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [persistedLogs, setPersistedLogs] = useState<PersistedLog[]>([])
  const [historyRange, setHistoryRange] = useState<HistoryRange>('24h')
  const [loadingHistory, setLoadingHistory] = useState(false)

  const fetchHealth = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/health')
      if (!res.ok) throw new Error('Failed to fetch health')
      const data: HealthResponse = await res.json()
      setCurrent(data)

      setHistory(prev => {
        const entry: HistoryEntry = {
          timestamp: data.timestamp,
          label: new Date(data.timestamp).toLocaleTimeString('ka-GE', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          status: data.status,
          avg_ms: Math.round(data.checks.reduce((s, c) => s + c.time_ms, 0) / data.checks.length),
          max_ms: Math.max(...data.checks.map(c => c.time_ms)),
          checks: data.checks,
        }
        return [...prev, entry].slice(-30)
      })
    } catch {
      // Silently fail — user sees stale data
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPersistedHistory = useCallback(async (range: HistoryRange) => {
    setLoadingHistory(true)
    try {
      const rangeMs = { '1h': 3600000, '24h': 86400000, '7d': 604800000, '30d': 2592000000 }
      const since = new Date(Date.now() - rangeMs[range]).toISOString()
      const { data, error } = await (supabase as any)
        .from('health_check_logs')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .limit(500)
      if (error) throw error
      setPersistedLogs(data || [])
    } catch {
      // Silently fail
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
    fetchPersistedHistory(historyRange)
  }, [fetchHealth, fetchPersistedHistory, historyRange])

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchHealth, 15000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh, fetchHealth])

  // Persisted history chart data (must be before early return)
  const persistedTrendData = useMemo(() => {
    return persistedLogs.map(log => {
      const point: Record<string, any> = {
        label: new Date(log.created_at).toLocaleString('ka-GE', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        avg_ms: log.avg_ms,
        max_ms: log.max_ms,
      }
      for (const check of log.checks) {
        point[check.name] = check.time_ms
      }
      return point
    })
  }, [persistedLogs])

  const persistedCheckNames = useMemo(() => {
    if (persistedLogs.length === 0) return []
    const names = new Set<string>()
    for (const log of persistedLogs) {
      for (const c of log.checks) names.add(c.name)
    }
    return Array.from(names)
  }, [persistedLogs])

  const persistedStats = useMemo(() => {
    if (persistedLogs.length === 0) return null
    const avgValues = persistedLogs.map(l => l.avg_ms)
    const maxValues = persistedLogs.map(l => l.max_ms)
    return {
      count: persistedLogs.length,
      avgOfAvg: Math.round(avgValues.reduce((a, b) => a + b, 0) / avgValues.length),
      minAvg: Math.min(...avgValues),
      maxAvg: Math.max(...avgValues),
      avgOfMax: Math.round(maxValues.reduce((a, b) => a + b, 0) / maxValues.length),
      maxOfMax: Math.max(...maxValues),
      healthy: persistedLogs.filter(l => l.status === 'healthy').length,
      degraded: persistedLogs.filter(l => l.status === 'degraded').length,
      unhealthy: persistedLogs.filter(l => l.status === 'unhealthy').length,
    }
  }, [persistedLogs])

  if (userRole?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-text-secondary">Admin access required</p>
      </div>
    )
  }

  const statusConfig = current ? STATUS_CONFIG[current.status] : null
  const StatusIcon = statusConfig?.icon || Activity
  const groups = current ? groupChecks(current.checks) : null

  // Trend data
  const trendData = history.map(h => {
    const point: Record<string, any> = { label: h.label }
    for (const check of h.checks) {
      point[check.name] = check.time_ms
    }
    return point
  })

  const checkNames = current?.checks.map(c => c.name) || []
  const lineColors = [
    '#6366f1',
    '#06b6d4',
    '#f59e0b',
    '#ef4444',
    '#22c55e',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
    '#a855f7',
    '#64748b',
    '#0ea5e9',
  ]

  return (
    <div className="min-h-screen bg-bg-primary p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${statusConfig?.bg || 'bg-bg-secondary'}`}>
              <Server className={`w-6 h-6 ${statusConfig?.color || 'text-text-secondary'}`} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">System Health</h1>
              {current && (
                <p className="text-sm text-text-secondary">
                  Last check: {new Date(current.timestamp).toLocaleTimeString('ka-GE')}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                autoRefresh
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  : 'bg-bg-secondary text-text-secondary border border-border-light hover:text-text-primary'
              }`}
            >
              {autoRefresh ? 'Auto: ON (15s)' : 'Auto: OFF'}
            </button>
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-bg-secondary border border-border-light rounded-lg text-sm font-medium text-text-primary hover:bg-bg-tertiary transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Status Banner */}
        {current && (
          <div
            className={`flex items-center gap-4 p-4 rounded-xl border ${statusConfig?.bg} ${statusConfig?.border}`}
          >
            <StatusIcon className={`w-8 h-8 ${statusConfig?.color}`} />
            <div className="flex-1">
              <p className={`text-lg font-bold ${statusConfig?.color}`}>{statusConfig?.label}</p>
              <p className="text-sm text-text-secondary">
                {current.summary.ok} ok · {current.summary.slow} slow · {current.summary.failed}{' '}
                failed
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono font-bold text-text-primary">
                {current.checks.length > 0
                  ? Math.round(
                      current.checks.reduce((s, c) => s + c.time_ms, 0) / current.checks.length
                    )
                  : 0}
                <span className="text-sm text-text-secondary ml-1">ms avg</span>
              </p>
              <p className="text-xs text-text-secondary">
                max: {Math.max(...current.checks.map(c => c.time_ms))}ms
              </p>
            </div>
          </div>
        )}

        {/* AI Analysis */}
        <HealthAiAnalysis current={current} />

        {/* Grouped Check Cards */}
        {groups && (
          <div className="space-y-4">
            {Object.entries(groups).map(([groupKey, groupChecks]) => {
              if (groupChecks.length === 0) return null
              const groupInfo = GROUP_LABELS[groupKey]
              const GroupIcon = groupInfo.icon
              return (
                <div key={groupKey}>
                  <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                    <GroupIcon className="w-3.5 h-3.5" />
                    {groupInfo.label}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                    {groupChecks.map(check => {
                      const isOk = check.status === 'ok'
                      const isSlow = check.status === 'slow'
                      const CheckIcon = CHECK_ICONS[check.name] || Database
                      return (
                        <div
                          key={check.name}
                          className={`p-4 rounded-xl border ${
                            isOk
                              ? 'bg-bg-secondary border-border-light'
                              : isSlow
                                ? 'bg-yellow-500/5 border-yellow-500/20'
                                : 'bg-red-500/5 border-red-500/20'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-text-secondary">
                              {CHECK_LABELS[check.name] || check.name}
                            </span>
                            {isOk ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                            ) : isSlow ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-red-400" />
                            )}
                          </div>
                          <p className="text-xl font-mono font-bold text-text-primary">
                            {check.time_ms}
                            <span className="text-xs text-text-secondary ml-1">ms</span>
                          </p>
                          {check.result !== undefined && check.result !== 'pong' && (
                            <p className="text-xs text-text-secondary mt-1">
                              {typeof check.result === 'number'
                                ? check.result.toLocaleString() + ' rows'
                                : String(check.result)}
                            </p>
                          )}
                          {check.error && (
                            <p className="text-xs text-red-400 mt-1 truncate" title={check.error}>
                              {check.error}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          {current && (
            <div className="bg-bg-secondary border border-border-light rounded-xl p-5">
              <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-secondary" />
                Response Times
              </h2>
              <ResponsiveContainer width="100%" height={Math.max(280, current.checks.length * 32)}>
                <BarChart
                  data={current.checks.map(c => ({
                    name: CHECK_LABELS[c.name] || c.name,
                    time_ms: c.time_ms,
                    status: c.status,
                  }))}
                  layout="vertical"
                  margin={{ left: 90, right: 20, top: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis
                    type="number"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                    unit="ms"
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fill: 'var(--text-primary)', fontSize: 12 }}
                    width={85}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                    }}
                    formatter={(value: any) => [`${value} ms`, 'Response Time']}
                  />
                  <Bar dataKey="time_ms" radius={[0, 4, 4, 0]}>
                    {current.checks.map((c, i) => (
                      <Cell key={i} fill={BAR_COLORS[c.status]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Avg/Max Trend */}
          {history.length > 1 && (
            <div className="bg-bg-secondary border border-border-light rounded-xl p-5">
              <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-text-secondary" />
                Avg vs Max
                <span className="text-xs font-normal text-text-secondary">
                  ({history.length} checks)
                </span>
              </h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={history} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} unit="ms" />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg_ms"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                    name="Average"
                  />
                  <Line
                    type="monotone"
                    dataKey="max_ms"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    name="Max"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Detailed Trend Chart */}
        {history.length > 1 && (
          <div className="bg-bg-secondary border border-border-light rounded-xl p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-text-secondary" />
              Per-Check Trends
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} unit="ms" />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                  }}
                  formatter={(value: any, name: any) => [`${value} ms`, CHECK_LABELS[name] || name]}
                />
                {checkNames.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={lineColors[i % lineColors.length]}
                    strokeWidth={2}
                    dot={false}
                    name={name}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-3 justify-center">
              {checkNames.map((name, i) => (
                <div key={name} className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: lineColors[i % lineColors.length] }}
                  />
                  {CHECK_LABELS[name] || name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Persistent History */}
        <div className="bg-bg-secondary border border-border-light rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <History className="w-4 h-4 text-text-secondary" />
              Historical Performance
              {persistedStats && (
                <span className="text-xs font-normal text-text-secondary">
                  ({persistedStats.count} checks)
                </span>
              )}
            </h2>
            <div className="flex items-center gap-1">
              {(['1h', '24h', '7d', '30d'] as HistoryRange[]).map(range => (
                <button
                  key={range}
                  onClick={() => setHistoryRange(range)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    historyRange === range
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {range}
                </button>
              ))}
              <button
                onClick={() => fetchPersistedHistory(historyRange)}
                disabled={loadingHistory}
                className="ml-2 p-1 text-text-secondary hover:text-text-primary"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Stats summary */}
          {persistedStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-bg-primary">
                <p className="text-xs text-text-secondary">Avg Response</p>
                <p className="text-lg font-mono font-bold text-text-primary">
                  {persistedStats.avgOfAvg}
                  <span className="text-xs text-text-secondary ml-1">ms</span>
                </p>
              </div>
              <div className="p-3 rounded-lg bg-bg-primary">
                <p className="text-xs text-text-secondary">Best Avg</p>
                <p className="text-lg font-mono font-bold text-green-400">
                  {persistedStats.minAvg}
                  <span className="text-xs text-text-secondary ml-1">ms</span>
                </p>
              </div>
              <div className="p-3 rounded-lg bg-bg-primary">
                <p className="text-xs text-text-secondary">Worst Avg</p>
                <p className="text-lg font-mono font-bold text-red-400">
                  {persistedStats.maxAvg}
                  <span className="text-xs text-text-secondary ml-1">ms</span>
                </p>
              </div>
              <div className="p-3 rounded-lg bg-bg-primary">
                <p className="text-xs text-text-secondary">Uptime</p>
                <p className="text-lg font-mono font-bold text-text-primary">
                  {persistedStats.count > 0
                    ? Math.round((persistedStats.healthy / persistedStats.count) * 100)
                    : 0}
                  <span className="text-xs text-text-secondary ml-1">%</span>
                </p>
              </div>
            </div>
          )}

          {/* Historical avg/max trend */}
          {persistedTrendData.length > 1 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={persistedTrendData}
                margin={{ left: 10, right: 10, top: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} unit="ms" />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="avg_ms"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  name="Average"
                />
                <Line
                  type="monotone"
                  dataKey="max_ms"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  dot={false}
                  name="Max"
                  strokeDasharray="4 2"
                />
                {persistedCheckNames
                  .filter(n => ['db_ping', 'auth_latency', 'rls_query'].includes(n))
                  .map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={lineColors[(i + 2) % lineColors.length]}
                      strokeWidth={1}
                      dot={false}
                      name={CHECK_LABELS[name] || name}
                      strokeOpacity={0.6}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-text-secondary">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">
                No historical data yet. Health checks will be saved automatically.
              </p>
            </div>
          )}
        </div>

        {/* Empty state */}
        {!current && !loading && (
          <div className="text-center py-16 text-text-secondary">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No health data yet. Click Refresh to run checks.</p>
          </div>
        )}
      </div>
    </div>
  )
}
