'use client'

import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts'
import type { RouteStatusBreakdown } from '@/services/analytics.service'

interface RouteStatusChartProps {
  data: RouteStatusBreakdown[]
}

const STATUS_COLORS: Record<string, string> = {
  planned: '#6161FF',
  in_progress: '#FDAB3D',
  completed: '#00C875',
  cancelled: '#E2445C',
  unknown: '#C3C6D4',
}

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  unknown: 'Unknown',
}

export function RouteStatusChart({ data }: RouteStatusChartProps) {
  const chartData = data.map(d => ({
    ...d,
    name: STATUS_LABELS[d.status] || d.status,
    color: STATUS_COLORS[d.status] || STATUS_COLORS.unknown,
  }))

  const total = chartData.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Route Status Distribution</h3>
      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">No route data available</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="count"
              nameKey="name"
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any) => [`${value} (${total > 0 ? Math.round((value / total) * 100) : 0}%)`, 'Count']}
            />
            <Legend />
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold fill-gray-700">
              {total}
            </text>
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
