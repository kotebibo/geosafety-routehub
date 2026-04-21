'use client'

import { useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import type { ActivityBreakdown } from '@/services/board-analytics.service'

const COLORS = [
  '#579BFC',
  '#00C875',
  '#FDAB3D',
  '#E2445C',
  '#A25DDC',
  '#FF642E',
  '#00D2D2',
  '#CAB641',
  '#9CD326',
  '#FF158A',
  '#784BD1',
  '#66CCFF',
  '#FF7575',
  '#0086C0',
  '#5559DF',
]

type MetricKey = 'count' | 'revenue'

interface ActivityBreakdownChartProps {
  data: ActivityBreakdown[]
}

export function ActivityBreakdownChart({ data }: ActivityBreakdownChartProps) {
  const [metric, setMetric] = useState<MetricKey>('count')
  const top = data.slice(0, 20)
  const chartData = [...top].reverse() // Reverse for horizontal bar (top item at top)

  return (
    <div className="bg-bg-primary rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">საქმიანობა</h3>
        <div className="flex gap-1 bg-bg-secondary rounded-md p-0.5">
          <button
            onClick={() => setMetric('count')}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              metric === 'count'
                ? 'bg-bg-primary text-text-primary shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            რაოდენობა
          </button>
          <button
            onClick={() => setMetric('revenue')}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              metric === 'revenue'
                ? 'bg-bg-primary text-text-primary shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            შემოსავალი
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(400, top.length * 28)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 0, right: 20, top: 5, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-light)" />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
            tickFormatter={v => (metric === 'revenue' ? `₾${v.toLocaleString()}` : String(v))}
          />
          <YAxis
            type="category"
            dataKey="activity"
            width={180}
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          />
          <Tooltip
            formatter={(value: any) => [
              metric === 'revenue' ? `₾${value.toLocaleString()}` : value,
              metric === 'revenue' ? 'შემოსავალი' : 'კომპანიები',
            ]}
            contentStyle={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--text-primary)',
            }}
          />
          <Bar dataKey={metric} radius={[0, 4, 4, 0]} maxBarSize={20}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
