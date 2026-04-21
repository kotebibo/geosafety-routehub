'use client'

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import type { ServiceTypeRevenue } from '@/services/board-analytics.service'

const COLORS = [
  '#579BFC',
  '#00C875',
  '#FDAB3D',
  '#E2445C',
  '#A25DDC',
  '#FF642E',
  '#00D2D2',
  '#CAB641',
  '#9CD326',
  '#FF158A',
  '#784BD1',
  '#66CCFF',
]

interface ServiceTypeRevenueChartProps {
  data: ServiceTypeRevenue[]
}

export function ServiceTypeRevenueChart({ data }: ServiceTypeRevenueChartProps) {
  const total = data.reduce((s, d) => s + d.revenue, 0)

  return (
    <div className="bg-bg-primary rounded-lg border p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-4">შემოსავალი სერვისის ტიპით</h3>
      <div className="flex items-center gap-6">
        <div className="flex-shrink-0">
          <ResponsiveContainer width={220} height={220} minWidth={0}>
            <PieChart>
              <Pie
                data={data}
                dataKey="revenue"
                nameKey="service_type"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => [`₾${value.toLocaleString()}`, 'შემოსავალი']}
                contentStyle={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--text-primary)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto max-h-[220px]">
          {data.map((item, i) => (
            <div key={item.service_type} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span
                  className="text-text-secondary truncate max-w-[140px]"
                  title={item.service_type}
                >
                  {item.service_type}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-text-primary font-medium">
                  ₾{item.revenue.toLocaleString()}
                </span>
                <span className="text-text-tertiary w-10 text-right">{item.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
