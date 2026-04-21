'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import type { TopLocation } from '@/services/board-analytics.service'

interface TopLocationsChartProps {
  data: TopLocation[]
}

export function TopLocationsChart({ data }: TopLocationsChartProps) {
  const formatted = data.slice(0, 12).map(d => ({
    ...d,
    label: d.name.length > 22 ? d.name.slice(0, 22) + '...' : d.name,
  }))

  return (
    <div className="bg-bg-primary rounded-lg border p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-4">ტოპ ლოკაციები შემოსავლით</h3>
      {data.length === 0 ? (
        <div className="h-[350px] flex items-center justify-center text-sm text-text-tertiary">
          მონაცემები არ არის
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={formatted} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-primary)"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              tickFormatter={v => `₾${v}`}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
              width={160}
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
              formatter={(value: any) => [`₾${value}`, 'თანხა']}
              labelFormatter={(_: any, payload: any) => {
                const item = payload?.[0]?.payload
                return item ? `${item.name} (${item.inspector})` : ''
              }}
            />
            <Bar dataKey="amount" fill="#A25DDC" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
