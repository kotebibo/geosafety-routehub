'use client'

import { Clock, Timer, CheckCircle2 } from 'lucide-react'
import { formatDuration } from '../utils'
import type { LocationCheckin } from '@/types/checkin'

interface CheckinHistoryProps {
  recentCheckins: LocationCheckin[]
}

export function CheckinHistory({ recentCheckins }: CheckinHistoryProps) {
  if (recentCheckins.length === 0) return null

  return (
    <div className="bg-bg-primary rounded-xl border border-border-light overflow-hidden">
      <div className="px-4 py-3 border-b border-border-light">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Clock className="w-4 h-4 text-text-tertiary" />
          {'\u10D1\u10DD\u10DA\u10DD \u10E9\u10D4\u10D9-\u10D8\u10DC\u10D4\u10D1\u10D8'}
        </h3>
      </div>
      <div className="divide-y divide-border-light">
        {recentCheckins.slice(0, 5).map(checkin => (
          <div key={checkin.id} className="px-4 py-3 flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                !checkin.checked_out_at
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-bg-tertiary text-text-secondary'
              }`}
            >
              {!checkin.checked_out_at ? (
                <Timer className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {checkin.company_name}
              </p>
              <div className="flex items-center gap-2 text-xs text-text-tertiary">
                <span>
                  {new Date(checkin.created_at).toLocaleDateString('ka-GE', {
                    day: '2-digit',
                    month: '2-digit',
                  })}{' '}
                  {new Date(checkin.created_at).toLocaleTimeString('ka-GE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {checkin.duration_minutes != null && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded">
                    {formatDuration(checkin.duration_minutes)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
