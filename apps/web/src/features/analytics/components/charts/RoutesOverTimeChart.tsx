'use client'

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import type { RoutesByDay } from '@/services/analytics.service'

interface RoutesOverTimeChartProps {
  data: RoutesByDay[]
}

export function RoutesOverTimeChart({ data }: RoutesOverTimeChartProps) {
  const formatted = data.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Routes Over Time (Last 30 Days)</h3>
      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">No route data available</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="planned" stroke="#6161FF" strokeWidth={2} name="Planned" dot={false} />
            <Line type="monotone" dataKey="completed" stroke="#00C875" strokeWidth={2} name="Completed" dot={false} />
            <Line type="monotone" dataKey="cancelled" stroke="#E2445C" strokeWidth={2} name="Cancelled" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
