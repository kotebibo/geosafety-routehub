'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import type { MonthlyTrend } from '@/services/board-analytics.service'

interface MonthlyTrendChartProps {
  data: MonthlyTrend[]
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  return (
    <div className="bg-bg-primary rounded-lg border p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-4">ყოველთვიური ტრენდი</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#579BFC" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#579BFC" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="contractsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00C875" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00C875" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="revenue"
            tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `₾${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          />
          <YAxis
            yAxisId="contracts"
            orientation="right"
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
              color: 'var(--text-primary)',
            }}
            formatter={(value: any, name: any) => [
              name === 'revenue' ? `₾${value.toLocaleString()}` : value,
              name === 'revenue' ? 'შემოსავალი' : 'ახალი კონტრაქტები',
            ]}
          />
          <Area
            yAxisId="revenue"
            type="monotone"
            dataKey="revenue"
            stroke="#579BFC"
            fill="url(#revenueGrad)"
            strokeWidth={2}
          />
          <Area
            yAxisId="contracts"
            type="monotone"
            dataKey="new_contracts"
            stroke="#00C875"
            fill="url(#contractsGrad)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
