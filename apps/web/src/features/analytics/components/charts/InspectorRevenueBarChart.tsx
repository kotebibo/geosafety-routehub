'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import type { InspectorSummary } from '@/services/board-analytics.service'

interface InspectorRevenueBarChartProps {
  data: InspectorSummary[]
}

export function InspectorRevenueBarChart({ data }: InspectorRevenueBarChartProps) {
  const chartData = data.slice(0, 15).map(d => ({
    ...d,
    shortName: d.name.length > 20 ? d.name.slice(0, 20) + '…' : d.name,
  }))

  return (
    <div className="bg-bg-primary rounded-lg border p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-4">შემოსავალი ინსპექტორით</h3>
      <ResponsiveContainer width="100%" height={380}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `₾${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          />
          <YAxis
            type="category"
            dataKey="shortName"
            width={140}
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--text-primary)',
            }}
            formatter={(value: any) => [`₾${value.toLocaleString()}`, 'შემოსავალი']}
            labelFormatter={(label: any) => {
              const item = chartData.find(d => d.shortName === label)
              return item?.name || label
            }}
          />
          <Bar dataKey="total_amount" fill="#579BFC" radius={[0, 4, 4, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
