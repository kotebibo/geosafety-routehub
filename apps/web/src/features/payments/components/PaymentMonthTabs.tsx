import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react'

import { cn } from '@/lib/utils'

import { MONTHS_KA } from '../helpers'

interface PaymentMonthTabsProps {
  selectedYear: number
  selectedMonth: number | null
  yearOptions: number[]
  dateFrom: string
  dateTo: string
  onNavigateMonth: (delta: number) => void
  onSelectMonth: (month: number | null) => void
  onSelectYear: (year: number) => void
  onClearDateFilter: () => void
}

export function PaymentMonthTabs({
  selectedYear,
  selectedMonth,
  yearOptions,
  dateFrom,
  dateTo,
  onNavigateMonth,
  onSelectMonth,
  onSelectYear,
  onClearDateFilter,
}: PaymentMonthTabsProps) {
  const now = new Date()

  return (
    <>
      <div className="bg-bg-primary rounded-xl border border-border-light p-1 flex items-center gap-1">
        <button
          onClick={() => onNavigateMonth(-1)}
          className="p-2 rounded-lg hover:bg-bg-secondary transition-colors text-text-secondary"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 flex items-center gap-0.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              onClearDateFilter()
              onSelectMonth(null)
            }}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              selectedMonth === null && !dateFrom && !dateTo
                ? 'bg-monday-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
            )}
          >
            ყველა
          </button>
          <div className="w-px h-4 bg-border-light mx-0.5" />
          {MONTHS_KA.map((name, i) => {
            const isSelected = selectedMonth === i && !dateFrom && !dateTo
            const isCurrent = now.getMonth() === i && now.getFullYear() === selectedYear
            return (
              <button
                key={i}
                onClick={() => {
                  onClearDateFilter()
                  onSelectMonth(i)
                }}
                className={cn(
                  'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  isSelected
                    ? 'bg-monday-primary text-white shadow-sm'
                    : isCurrent
                      ? 'bg-monday-primary/10 text-monday-primary hover:bg-monday-primary/20'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                )}
              >
                {name}
              </button>
            )
          })}
        </div>

        <div className="pl-2 border-l border-border-light">
          <select
            value={selectedYear}
            onChange={e => {
              onSelectYear(Number(e.target.value))
              onClearDateFilter()
            }}
            className="px-2 py-1 rounded-lg text-xs font-bold text-text-primary bg-bg-secondary border-none focus:outline-none focus:ring-2 focus:ring-monday-primary/30 cursor-pointer"
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => onNavigateMonth(1)}
          className="p-2 rounded-lg hover:bg-bg-secondary transition-colors text-text-secondary"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Custom date range indicator */}
      {(dateFrom || dateTo) && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <Calendar className="w-4 h-4" />
          <span>
            ფილტრი: {dateFrom || '...'} — {dateTo || '...'}
          </span>
          <button onClick={onClearDateFilter} className="ml-auto p-0.5 hover:bg-blue-100 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  )
}
