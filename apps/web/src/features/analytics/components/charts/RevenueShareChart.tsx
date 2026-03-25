'use client'

import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts'

interface RevenueShareItem {
  name: string
  total_amount: number
}

interface RevenueShareChartProps {
  data: RevenueShareItem[]
}

const COLORS = [
  '#6161FF',
  '#00C875',
  '#FDAB3D',
  '#E2445C',
  '#A25DDC',
  '#FF158A',
  '#0086C0',
  '#9CD326',
  '#CAB641',
  '#784BD1',
  '#FF5AC4',
  '#66CCFF',
]

export function RevenueShareChart({ data }: RevenueShareChartProps) {
  const sorted = [...data].sort((a, b) => b.total_amount - a.total_amount)
  const top = sorted.slice(0, 10)
  const rest = sorted.slice(10)
  const restTotal = rest.reduce((sum, d) => sum + d.total_amount, 0)

  const chartData = top.map((d, i) => ({
    name: d.name.length > 20 ? d.name.slice(0, 20) + '...' : d.name,
    value: Math.round(d.total_amount * 100) / 100,
    color: COLORS[i % COLORS.length],
  }))

  if (restTotal > 0) {
    chartData.push({
      name: 'სხვა',
      value: Math.round(restTotal * 100) / 100,
      color: '#C3C6D4',
    })
  }

  const total = chartData.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="bg-bg-primary rounded-lg border p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-4">შემოსავლის წილი (%)</h3>
      {data.length === 0 ? (
        <div className="h-[350px] flex items-center justify-center text-sm text-text-tertiary">
          მონაცემები არ არის
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any) => [
                `₾${value} (${total > 0 ? Math.round((value / total) * 100) : 0}%)`,
                'თანხა',
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <text
              x="50%"
              y="48%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-lg font-bold fill-text-primary"
            >
              ₾{Math.round(total)}
            </text>
            <text
              x="50%"
              y="56%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs fill-text-secondary"
            >
              ჯამი
            </text>
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
