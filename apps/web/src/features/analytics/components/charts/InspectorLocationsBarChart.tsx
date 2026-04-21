'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import type { InspectorSummary } from '@/services/board-analytics.service'

interface InspectorLocationsBarChartProps {
  data: InspectorSummary[]
}

export function InspectorLocationsBarChart({ data }: InspectorLocationsBarChartProps) {
  const chartData = [...data]
    .sort((a, b) => b.locations - a.locations)
    .slice(0, 15)
    .map(d => ({
      ...d,
      shortName: d.name.length > 20 ? d.name.slice(0, 20) + '…' : d.name,
    }))

  return (
    <div className="bg-bg-primary rounded-lg border p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-4">ლოკაციები ინსპექტორით</h3>
      <ResponsiveContainer width="100%" height={380}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
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
            formatter={(value: any) => [value, 'ლოკაციები']}
            labelFormatter={(label: any) => {
              const item = chartData.find(d => d.shortName === label)
              return item?.name || label
            }}
          />
          <Bar dataKey="locations" fill="#00C875" radius={[0, 4, 4, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
