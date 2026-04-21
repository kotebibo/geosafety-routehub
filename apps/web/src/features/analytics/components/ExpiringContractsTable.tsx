'use client'

import type { ExpiringContract } from '@/services/board-analytics.service'

interface ExpiringContractsTableProps {
  data: ExpiringContract[]
}

export function ExpiringContractsTable({ data }: ExpiringContractsTableProps) {
  const urgencyClass = (days: number) => {
    if (days <= 0) return 'text-red-500 bg-red-50'
    if (days <= 30) return 'text-red-600 bg-red-50'
    if (days <= 90) return 'text-amber-600 bg-amber-50'
    return 'text-green-600 bg-green-50'
  }

  const urgencyLabel = (days: number) => {
    if (days <= 0) return 'ვადაგასული'
    if (days <= 30) return `${days} დღე`
    if (days <= 90) return `${days} დღე`
    return `${days} დღე`
  }

  return (
    <div className="bg-bg-primary rounded-lg border">
      <div className="px-6 py-4 border-b">
        <h3 className="text-sm font-semibold text-text-primary">კონტრაქტების ვადები</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-bg-secondary/50">
              <th className="text-left px-4 py-2.5 text-text-secondary font-medium">კომპანია</th>
              <th className="text-left px-4 py-2.5 text-text-secondary font-medium">ინსპექტორი</th>
              <th className="text-right px-4 py-2.5 text-text-secondary font-medium">თანხა</th>
              <th className="text-left px-4 py-2.5 text-text-secondary font-medium">ვადა</th>
              <th className="text-center px-4 py-2.5 text-text-secondary font-medium">სტატუსი</th>
              <th className="text-left px-4 py-2.5 text-text-secondary font-medium">სერვისი</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 20).map((contract, i) => (
              <tr
                key={i}
                className="border-b last:border-0 hover:bg-bg-secondary/30 transition-colors"
              >
                <td
                  className="px-4 py-2.5 text-text-primary font-medium truncate max-w-[200px]"
                  title={contract.name}
                >
                  {contract.name}
                </td>
                <td
                  className="px-4 py-2.5 text-text-secondary truncate max-w-[120px]"
                  title={contract.inspector}
                >
                  {contract.inspector}
                </td>
                <td className="px-4 py-2.5 text-text-primary text-right font-medium">
                  ₾{contract.amount.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-text-secondary">{contract.end_date}</td>
                <td className="px-4 py-2.5 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${urgencyClass(contract.days_remaining)}`}
                  >
                    {urgencyLabel(contract.days_remaining)}
                  </span>
                </td>
                <td
                  className="px-4 py-2.5 text-text-secondary truncate max-w-[120px]"
                  title={contract.service_type}
                >
                  {contract.service_type}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length > 20 && (
        <div className="px-4 py-2 text-xs text-text-tertiary border-t">
          ნაჩვენებია 20 / {data.length}
        </div>
      )}
    </div>
  )
}
