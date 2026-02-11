'use client'

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import type { WeeklyDistance } from '@/services/analytics.service'

interface WeeklyDistanceChartProps {
  data: WeeklyDistance[]
}

export function WeeklyDistanceChart({ data }: WeeklyDistanceChartProps) {
  const formatted = data.map(d => ({
    ...d,
    week: new Date(d.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Weekly Distance Covered (km)</h3>
      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">No distance data available</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value: any) => [`${value} km`, 'Distance']} />
            <defs>
              <linearGradient id="distanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#579BFC" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#579BFC" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="total_distance_km"
              stroke="#579BFC"
              strokeWidth={2}
              fill="url(#distanceGradient)"
              name="Distance (km)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
