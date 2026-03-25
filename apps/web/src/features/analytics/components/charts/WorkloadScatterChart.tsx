'use client'

import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ZAxis,
} from 'recharts'
import type { InspectorScatter } from '@/services/board-analytics.service'

interface WorkloadScatterChartProps {
  data: InspectorScatter[]
}

export function WorkloadScatterChart({ data }: WorkloadScatterChartProps) {
  return (
    <div className="bg-bg-primary rounded-lg border p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-4">
        ინსპექტორი: ლოკაციები vs შემოსავალი
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <ScatterChart margin={{ bottom: 10, left: 10, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
          <XAxis
            type="number"
            dataKey="locations"
            name="ლოკაციები"
            tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            label={{
              value: 'ლოკაციები',
              position: 'insideBottom',
              offset: -5,
              fill: 'var(--text-tertiary)',
              fontSize: 11,
            }}
          />
          <YAxis
            type="number"
            dataKey="revenue"
            name="შემოსავალი"
            tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `₾${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          />
          <ZAxis range={[60, 60]} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: any, name: any) => [
              name === 'შემოსავალი' ? `₾${value.toLocaleString()}` : value,
              name,
            ]}
            labelFormatter={(_: any, payload: any) => payload?.[0]?.payload?.name || ''}
          />
          <Scatter data={data} fill="#A25DDC" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
