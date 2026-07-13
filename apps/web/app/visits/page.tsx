'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CalendarClock, CheckCircle2, MapPinned, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import { OVERDUE_VISIT_DAYS } from '@/features/boards/constants/checkin'

interface VisitDue {
  item_id: string
  item_name: string
  board_id: string
  board_name: string
  last_visit_at: string | null
  days_since_visit: number | null
  status: 'overdue' | 'due_soon' | 'never_visited' | 'ok'
}

const SECTIONS: Array<{
  key: VisitDue['status']
  title: string
  icon: typeof AlertTriangle
  accent: string
}> = [
  { key: 'overdue', title: 'ვადაგადაცილებული', icon: AlertTriangle, accent: 'text-red-500' },
  { key: 'due_soon', title: 'მალე დგება ვადა', icon: CalendarClock, accent: 'text-orange-500' },
  {
    key: 'never_visited',
    title: 'ვიზიტი არ ყოფილა',
    icon: MapPinned,
    accent: 'text-text-tertiary',
  },
  { key: 'ok', title: 'წესრიგშია', icon: CheckCircle2, accent: 'text-green-600' },
]

export default function VisitsPage() {
  const router = useRouter()

  const {
    data: visits = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery<VisitDue[]>({
    queryKey: ['checkins', 'visits-due'],
    queryFn: async () => {
      const res = await fetch('/api/checkins/visits-due')
      if (!res.ok) throw new Error('Failed to load visits')
      return res.json()
    },
    staleTime: 60_000,
  })

  const bySection = SECTIONS.map(s => ({
    ...s,
    items: visits.filter(v => v.status === s.key),
  }))

  const overdueCount = bySection[0].items.length
  const dueSoonCount = bySection[1].items.length

  return (
    <div className="min-h-screen bg-bg-secondary">
      <PageHeader
        title="ვიზიტები"
        description={`ვიზიტის განრიგი ჩეკ-ინების მიხედვით — ${OVERDUE_VISIT_DAYS} დღეზე ძველი ვიზიტი ვადაგადაცილებულია`}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Summary strip */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-bg-primary rounded-xl border border-border-light p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{overdueCount}</p>
              <p className="text-xs text-text-secondary">ვადაგადაცილებული</p>
            </div>
          </div>
          <div className="bg-bg-primary rounded-xl border border-border-light p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <CalendarClock className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{dueSoonCount}</p>
              <p className="text-xs text-text-secondary">მალე დგება ვადა</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary bg-bg-primary border border-border-light rounded-lg hover:bg-bg-hover transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            განახლება
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className="animate-pulse bg-bg-primary rounded-xl border border-border-light h-16"
              />
            ))}
          </div>
        ) : visits.length === 0 ? (
          <div className="py-16 text-center bg-bg-primary rounded-xl border border-border-light">
            <MapPinned className="w-8 h-8 text-text-tertiary mx-auto mb-3" />
            <p className="text-sm text-text-secondary">
              ვიზიტების განრიგი ცარიელია — თქვენს დაფებზე ჩეკ-ინის სვეტი არ არის
            </p>
          </div>
        ) : (
          bySection
            .filter(s => s.items.length > 0)
            .map(section => (
              <div key={section.key}>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-2">
                  <section.icon className={`w-4 h-4 ${section.accent}`} />
                  {section.title}
                  <span className="text-xs font-normal text-text-tertiary">
                    ({section.items.length})
                  </span>
                </h2>
                <div className="bg-bg-primary rounded-xl border border-border-light divide-y divide-border-light overflow-hidden">
                  {section.items.map(v => (
                    <button
                      key={v.item_id}
                      type="button"
                      onClick={() => router.push(`/boards/${v.board_id}`)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-bg-hover transition-colors ${
                        v.status === 'overdue' ? 'border-l-2 border-l-red-500' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {v.item_name}
                        </p>
                        <p className="text-xs text-text-tertiary truncate">{v.board_name}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {v.days_since_visit !== null ? (
                          <>
                            <p
                              className={`text-sm font-semibold ${
                                v.status === 'overdue'
                                  ? 'text-red-500'
                                  : v.status === 'due_soon'
                                    ? 'text-orange-500'
                                    : 'text-text-secondary'
                              }`}
                            >
                              {v.days_since_visit} დღე
                            </p>
                            <p className="text-xs text-text-tertiary">
                              {new Date(v.last_visit_at!).toLocaleDateString('ka-GE')}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-text-tertiary">ვიზიტი არ ყოფილა</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  )
}
