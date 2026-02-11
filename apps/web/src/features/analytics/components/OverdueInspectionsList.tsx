'use client'

import { AlertTriangle } from 'lucide-react'
import type { OverdueInspection } from '@/services/analytics.service'

interface OverdueInspectionsListProps {
  inspections: OverdueInspection[]
}

export function OverdueInspectionsList({ inspections }: OverdueInspectionsListProps) {
  const getUrgencyColor = (days: number) => {
    if (days > 30) return 'text-red-600 bg-red-50'
    if (days > 14) return 'text-orange-600 bg-orange-50'
    return 'text-yellow-600 bg-yellow-50'
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-orange-500" />
        <h3 className="text-sm font-semibold text-gray-700">Overdue Inspections ({inspections.length})</h3>
      </div>
      {inspections.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">No overdue inspections</div>
      ) : (
        <div className="overflow-y-auto max-h-[260px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500 uppercase">
                <th className="pb-2 pr-4">Company</th>
                <th className="pb-2 pr-4">Service</th>
                <th className="pb-2 pr-4">Due Date</th>
                <th className="pb-2">Overdue</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map((item, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 pr-4 font-medium text-gray-800">{item.company_name}</td>
                  <td className="py-2 pr-4 text-gray-600">{item.service_type_name}</td>
                  <td className="py-2 pr-4 text-gray-600">
                    {new Date(item.next_inspection_date).toLocaleDateString()}
                  </td>
                  <td className="py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(item.days_overdue)}`}>
                      {item.days_overdue}d
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
