'use client'

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
import type { ExpiryMonth } from '@/services/board-analytics.service'

const URGENCY_COLORS = {
  red: '#E2445C',
  amber: '#FDAB3D',
  green: '#00C875',
}

interface ExpiryTimelineChartProps {
  data: ExpiryMonth[]
}

export function ExpiryTimelineChart({ data }: ExpiryTimelineChartProps) {
  return (
    <div className="bg-bg-primary rounded-lg border p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-4">კონტრაქტების ვადის გასვლა</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: any) => [value, 'კონტრაქტები']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={28}>
            {data.map((entry, i) => (
              <Cell key={i} fill={URGENCY_COLORS[entry.urgency]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-3 text-xs text-text-tertiary">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: URGENCY_COLORS.red }} />
          <span>≤1 თვე</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: URGENCY_COLORS.amber }}
          />
          <span>2-3 თვე</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: URGENCY_COLORS.green }}
          />
          <span>3+ თვე</span>
        </div>
      </div>
    </div>
  )
}
