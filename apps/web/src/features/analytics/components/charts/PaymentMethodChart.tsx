'use client'

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import type { PaymentMethodBreakdown } from '@/services/board-analytics.service'

const COLORS = ['#579BFC', '#00C875', '#FDAB3D', '#E2445C', '#A25DDC', '#FF642E']

interface PaymentMethodChartProps {
  data: PaymentMethodBreakdown[]
}

export function PaymentMethodChart({ data }: PaymentMethodChartProps) {
  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <div className="bg-bg-primary rounded-lg border p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-4">გადახდის მეთოდი</h3>
      <div className="flex items-center gap-6">
        <div className="flex-shrink-0">
          <ResponsiveContainer width={180} height={180} minWidth={0}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="method"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
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
        <div className="flex-1 space-y-2">
          {data.map((item, i) => (
            <div key={item.method} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-text-secondary">{item.method}</span>
              </div>
              <span className="text-text-primary font-medium">
                {item.count} ({total > 0 ? Math.round((item.count / total) * 100) : 0}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
