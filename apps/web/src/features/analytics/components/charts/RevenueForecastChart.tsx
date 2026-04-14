'use client'

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { ForecastSummary } from '@/services/board-analytics.service'

interface RevenueForecastChartProps {
  data: ForecastSummary
}

export function RevenueForecastChart({ data }: RevenueForecastChartProps) {
  return (
    <div className="bg-bg-primary rounded-lg border p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-4">შემოსავლის პროგნოზი (12 თვე)</h3>
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={data.months}>
          <defs>
            <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#579BFC" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#579BFC" stopOpacity={0} />
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
            }}
            formatter={(value: any, name: any) => {
              const labels: Record<string, string> = {
                projected_revenue: 'პროგნოზირებული',
                expiring_revenue: 'ვადაგასული',
                active_contracts: 'აქტიური კონტრაქტები',
              }
              const label = labels[name] || name
              if (name === 'active_contracts') return [value, label]
              return [`₾${Number(value).toLocaleString()}`, label]
            }}
          />
          <Legend
            formatter={(value: string) => {
              const labels: Record<string, string> = {
                projected_revenue: 'პროგნოზირებული შემოსავალი',
                expiring_revenue: 'ვადაგასული შემოსავალი',
                active_contracts: 'აქტიური კონტრაქტები',
              }
              return labels[value] || value
            }}
            wrapperStyle={{ fontSize: 11 }}
          />
          <Area
            yAxisId="revenue"
            type="monotone"
            dataKey="projected_revenue"
            stroke="#579BFC"
            fill="url(#projectedGrad)"
            strokeWidth={2}
          />
          <Bar
            yAxisId="revenue"
            dataKey="expiring_revenue"
            fill="#E2445C"
            radius={[4, 4, 0, 0]}
            barSize={20}
            opacity={0.8}
          />
          <Area
            yAxisId="contracts"
            type="monotone"
            dataKey="active_contracts"
            stroke="#00C875"
            fill="none"
            strokeWidth={2}
            strokeDasharray="5 5"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
