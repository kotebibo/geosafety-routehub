'use client'

import React, { useMemo, useState } from 'react'
import { Clock, CheckCircle2, XCircle, MapPin, Timer, X, User } from 'lucide-react'
import { OverflowTooltip } from './OverflowTooltip'

interface CheckinData {
  checkin_id?: string
  inspector?: string
  company?: string
  location?: string
  checkin_date?: string
  checkout_date?: string | null
  coordinates?: string
  checkout_coordinates?: string | null
  duration_minutes?: number | null
  checkout_distance?: number | null
  location_match?: boolean | null
  accuracy?: number | null
  notes?: string
}

interface CheckinCellProps {
  value?: CheckinData | null
  row?: Record<string, any>
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} წთ`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} სთ ${m} წთ` : `${h} სთ`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const hours = d.getHours().toString().padStart(2, '0')
  const mins = d.getMinutes().toString().padStart(2, '0')
  return `${day}/${month} ${hours}:${mins}`
}

export function CheckinCell({ value, row }: CheckinCellProps) {
  const [showDetails, setShowDetails] = useState(false)

  const checkinData = useMemo<CheckinData | null>(() => {
    if (value && typeof value === 'object' && value.checkin_id) return value
    if (row?.data?.checkin_id) return row.data as CheckinData
    return null
  }, [value, row])

  if (!checkinData) {
    return (
      <div className="h-full min-h-[36px] flex items-center px-3 text-text-tertiary text-sm">-</div>
    )
  }

  const isActive = !checkinData.checkout_date
  const hasMatch = checkinData.location_match === true
  const hasMismatch = checkinData.location_match === false

  return (
    <>
      <button
        type="button"
        onClick={() => setShowDetails(true)}
        className="h-full min-h-[36px] w-full flex items-center gap-2 px-3 hover:bg-bg-hover transition-colors cursor-pointer"
      >
        {isActive ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            აქტიური
          </span>
        ) : (
          <>
            {hasMatch && <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />}
            {hasMismatch && <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
            {checkinData.duration_minutes != null && (
              <OverflowTooltip
                text={formatDuration(checkinData.duration_minutes)}
                className="text-sm text-text-primary truncate"
              >
                {formatDuration(checkinData.duration_minutes)}
              </OverflowTooltip>
            )}
            {checkinData.checkout_distance != null && (
              <span className="text-xs text-text-tertiary flex-shrink-0">
                {checkinData.checkout_distance}მ
              </span>
            )}
          </>
        )}
      </button>

      {showDetails && (
        <CheckinDetailsPopover data={checkinData} onClose={() => setShowDetails(false)} />
      )}
    </>
  )
}

interface CheckinDetailsPopoverProps {
  data: CheckinData
  onClose: () => void
}

function CheckinDetailsPopover({ data, onClose }: CheckinDetailsPopoverProps) {
  const isActive = !data.checkout_date

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-bg-primary rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div
          className={`px-4 py-3 flex items-center justify-between ${isActive ? 'bg-orange-50 border-b border-orange-200' : 'bg-bg-secondary border-b border-border-light'}`}
        >
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${isActive ? 'text-orange-600' : 'text-text-secondary'}`} />
            <span className="text-sm font-semibold text-text-primary">
              {isActive ? 'აქტიური ჩეკ-ინი' : 'ჩეკ-ინის დეტალები'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-bg-hover transition-colors"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {data.inspector && (
            <DetailRow
              icon={<User className="w-4 h-4" />}
              label="ინსპექტორი"
              value={data.inspector}
            />
          )}

          {data.checkin_date && (
            <DetailRow
              icon={<Clock className="w-4 h-4" />}
              label="ჩეკ-ინი"
              value={formatDate(data.checkin_date)}
            />
          )}

          {data.checkout_date && (
            <DetailRow
              icon={<Clock className="w-4 h-4" />}
              label="ჩეკ-აუთი"
              value={formatDate(data.checkout_date)}
            />
          )}

          {data.duration_minutes != null && (
            <DetailRow
              icon={<Timer className="w-4 h-4" />}
              label="ხანგრძლივობა"
              value={formatDuration(data.duration_minutes)}
            />
          )}

          {data.location && (
            <DetailRow
              icon={<MapPin className="w-4 h-4" />}
              label="ლოკაცია"
              value={data.location}
            />
          )}

          {data.checkout_distance != null && (
            <div className="flex items-center gap-2 text-sm">
              {data.location_match ? (
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              )}
              <span className="text-text-secondary">მანძილი:</span>
              <span
                className={`font-medium ${data.location_match ? 'text-green-700' : 'text-red-600'}`}
              >
                {data.checkout_distance}მ
                {data.location_match ? ' (დადასტურებული)' : ' (არ ემთხვევა)'}
              </span>
            </div>
          )}

          {data.notes && (
            <div className="pt-2 border-t border-border-light">
              <p className="text-xs text-text-tertiary mb-1">შენიშვნა</p>
              <p className="text-sm text-text-primary">{data.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-text-tertiary flex-shrink-0">{icon}</span>
      <span className="text-text-secondary">{label}:</span>
      <span className="text-text-primary font-medium truncate">{value}</span>
    </div>
  )
}
