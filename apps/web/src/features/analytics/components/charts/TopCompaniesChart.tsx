'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import type { TopCompany } from '@/services/analytics.service'

interface TopCompaniesChartProps {
  data: TopCompany[]
}

export function TopCompaniesChart({ data }: TopCompaniesChartProps) {
  const formatted = data.map(d => ({
    ...d,
    name: d.name.length > 20 ? d.name.slice(0, 20) + '...' : d.name,
  }))

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Companies by Inspections</h3>
      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">No inspection data available</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={formatted} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
            <Tooltip
              formatter={(value: any) => [value, 'Inspections']}
              labelFormatter={(label) => `Company: ${label}`}
            />
            <Bar dataKey="inspection_count" fill="#579BFC" name="Inspections" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
