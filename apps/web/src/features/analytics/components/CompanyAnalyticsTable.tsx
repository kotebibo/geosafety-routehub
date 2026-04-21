'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import type { CompanyRow } from '@/services/board-analytics.service'

interface CompanyAnalyticsTableProps {
  data: CompanyRow[]
}

export function CompanyAnalyticsTable({ data }: CompanyAnalyticsTableProps) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<keyof CompanyRow>('monthly')
  const [sortAsc, setSortAsc] = useState(false)

  const filtered = useMemo(() => {
    let rows = data
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(
        r =>
          r.name.toLowerCase().includes(q) ||
          r.inspector.toLowerCase().includes(q) ||
          r.service_type.toLowerCase().includes(q)
      )
    }
    return rows.sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv))
      return sortAsc ? cmp : -cmp
    })
  }, [data, search, sortKey, sortAsc])

  const handleSort = (key: keyof CompanyRow) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const thClass =
    'px-3 py-2.5 text-text-secondary font-medium cursor-pointer hover:text-text-primary select-none'
  const sortIcon = (key: keyof CompanyRow) => (sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : '')

  return (
    <div className="bg-bg-primary rounded-lg border">
      <div className="px-6 py-4 border-b flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-text-primary">კომპანიების ცხრილი</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
          <input
            type="text"
            placeholder="ძებნა..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs border rounded-md bg-bg-secondary text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-bg-secondary/50">
              <th className={`text-left ${thClass}`} onClick={() => handleSort('name')}>
                კომპანია{sortIcon('name')}
              </th>
              <th className={`text-left ${thClass}`} onClick={() => handleSort('service_type')}>
                სერვისი{sortIcon('service_type')}
              </th>
              <th className={`text-right ${thClass}`} onClick={() => handleSort('monthly')}>
                ყოველთვიური{sortIcon('monthly')}
              </th>
              <th className={`text-right ${thClass}`} onClick={() => handleSort('invoice')}>
                ინვოისი{sortIcon('invoice')}
              </th>
              <th className={`text-right ${thClass}`} onClick={() => handleSort('vat')}>
                დღგ{sortIcon('vat')}
              </th>
              <th className={`text-left ${thClass}`} onClick={() => handleSort('payment_method')}>
                გადახდა{sortIcon('payment_method')}
              </th>
              <th className={`text-left ${thClass}`} onClick={() => handleSort('end_date')}>
                ვადა{sortIcon('end_date')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map((row, i) => (
              <tr
                key={i}
                className="border-b last:border-0 hover:bg-bg-secondary/30 transition-colors"
              >
                <td
                  className="px-3 py-2.5 text-text-primary font-medium truncate max-w-[200px]"
                  title={row.name}
                >
                  {row.name}
                </td>
                <td
                  className="px-3 py-2.5 text-text-secondary truncate max-w-[120px]"
                  title={row.service_type}
                >
                  {row.service_type}
                </td>
                <td className="px-3 py-2.5 text-text-primary text-right">
                  ₾{row.monthly.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-text-primary text-right">
                  ₾{row.invoice.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-text-primary text-right">
                  ₾{row.vat.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-text-secondary">{row.payment_method}</td>
                <td className="px-3 py-2.5 text-text-secondary">{row.end_date || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length > 50 && (
        <div className="px-4 py-2 text-xs text-text-tertiary border-t">
          ნაჩვენებია 50 / {filtered.length}
        </div>
      )}
    </div>
  )
}
