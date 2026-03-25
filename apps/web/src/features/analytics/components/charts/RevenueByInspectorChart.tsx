'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
interface RevenueByInspectorChartProps {
  data: { name: string; total_amount: number }[]
}

export function RevenueByInspectorChart({ data }: RevenueByInspectorChartProps) {
  const formatted = data.slice(0, 12).map(d => ({
    ...d,
    name: d.name.length > 18 ? d.name.slice(0, 18) + '...' : d.name,
    fullName: d.name,
  }))

  return (
    <div className="bg-bg-primary rounded-lg border p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-4">
        შემოსავალი ინსპექტორების მიხედვით
      </h3>
      {data.length === 0 ? (
        <div className="h-[350px] flex items-center justify-center text-sm text-text-tertiary">
          მონაცემები არ არის
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={formatted} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `₾${v}`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
            <Tooltip
              formatter={(value: any) => [`₾${value}`, 'თანხა']}
              labelFormatter={(_: any, payload: any) => payload?.[0]?.payload?.fullName || ''}
            />
            <Bar dataKey="total_amount" fill="#6161FF" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
