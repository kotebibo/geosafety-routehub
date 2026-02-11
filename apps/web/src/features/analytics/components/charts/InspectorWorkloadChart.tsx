'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import type { InspectorWorkload } from '@/services/analytics.service'

interface InspectorWorkloadChartProps {
  data: InspectorWorkload[]
}

export function InspectorWorkloadChart({ data }: InspectorWorkloadChartProps) {
  const formatted = data.slice(0, 10).map(d => ({
    ...d,
    name: d.full_name.length > 15 ? d.full_name.slice(0, 15) + '...' : d.full_name,
  }))

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Inspector Workload (This Month)</h3>
      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">No workload data available</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              formatter={(value: any, name: any) => [value, name === 'route_count' ? 'Routes' : 'Stops']}
              labelFormatter={(label) => `Inspector: ${label}`}
            />
            <Legend />
            <Bar dataKey="route_count" fill="#6161FF" name="Routes" radius={[4, 4, 0, 0]} />
            <Bar dataKey="stop_count" fill="#00C875" name="Stops" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
