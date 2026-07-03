'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Timer,
  User,
  Navigation,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useGps } from '@/hooks/useGps'
import {
  useItemCheckins,
  useCreateItemCheckin,
  useCheckout,
} from '@/features/boards/hooks/useCheckinQueries'
import { parseCoordinates, haversineMeters, formatDuration, formatElapsed } from '@/lib/geo-utils'
import { getCheckinTypes } from '@/features/boards/constants/checkin'
import { useToast } from '@/components/ui-monday/Toast'
import type { BoardColumn } from '@/types/board'
import type { LocationCheckin } from '@/types/checkin'

const RADIUS_METERS = 200

interface CheckinBottomSheetProps {
  itemId: string
  itemName: string
  boardId: string
  column: BoardColumn
  row: Record<string, any>
  onClose: () => void
}

export function CheckinBottomSheet({
  itemId,
  itemName,
  boardId,
  column,
  row,
  onClose,
}: CheckinBottomSheetProps) {
  const { user } = useAuth()
  const { coords, error: gpsError } = useGps(true)
  const { showToast } = useToast()
  const [notes, setNotes] = useState('')
  const [checkinType, setCheckinType] = useState('')
  const [elapsedDisplay, setElapsedDisplay] = useState('')

  // Visit types depend on the column's service; required when the service
  // defines them, since the stage automation is driven by the selection
  const visitTypes = getCheckinTypes((column.config as Record<string, any>)?.service)

  const { data: checkins = [], isLoading } = useItemCheckins(itemId, true)
  const createCheckin = useCreateItemCheckin(boardId)
  const checkout = useCheckout(boardId)

  // Timeline includes previous inspectors' visits (history follows the item
  // across board transfers) — only the caller's own active checkin is
  // checkout-able; someone else's active visit just gets an info banner.
  const activeCheckin = useMemo(
    () =>
      checkins.find((c: LocationCheckin) => !c.checked_out_at && c.inspector_id === user?.id) ??
      null,
    [checkins, user?.id]
  )
  const othersActiveCheckin = useMemo(
    () =>
      checkins.find((c: LocationCheckin) => !c.checked_out_at && c.inspector_id !== user?.id) ??
      null,
    [checkins, user?.id]
  )

  // Resolve target coordinates from column config
  const targetCoords = useMemo(() => {
    const coordsColumnId = column.config?.coordinates_column_id
    if (!coordsColumnId || !row.data) return null
    return parseCoordinates(row.data[coordsColumnId])
  }, [column.config, row.data])

  const distance = useMemo(() => {
    if (!coords || !targetCoords) return null
    return Math.round(haversineMeters(coords.lat, coords.lng, targetCoords.lat, targetCoords.lng))
  }, [coords, targetCoords])

  const withinRadius = distance !== null && distance <= RADIUS_METERS
  const canCheckin =
    coords &&
    (distance === null || withinRadius) &&
    (visitTypes.length === 0 || checkinType !== '') &&
    !createCheckin.isPending

  // Elapsed timer for active checkin
  useEffect(() => {
    if (!activeCheckin) return
    const tick = () => setElapsedDisplay(formatElapsed(activeCheckin.created_at))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [activeCheckin])

  const handleCheckin = async () => {
    if (!user || !coords) return
    try {
      await createCheckin.mutateAsync({
        inspector_id: user.id,
        board_item_id: itemId,
        board_column_id: column.id,
        checkin_type: checkinType || undefined,
        lat: coords.lat,
        lng: coords.lng,
        accuracy: coords.accuracy,
        notes: notes.trim() || undefined,
      })
      setNotes('')
      setCheckinType('')
      showToast('ჩეკ-ინი წარმატებით შესრულდა', 'success')
    } catch (err: any) {
      showToast(err.error || 'ჩეკ-ინი ვერ შესრულდა', 'error')
    }
  }

  const handleCheckout = async () => {
    if (!activeCheckin || !coords) return
    try {
      await checkout.mutateAsync({
        checkin_id: activeCheckin.id,
        board_item_id: itemId,
        lat: coords.lat,
        lng: coords.lng,
        accuracy: coords.accuracy,
      })
      showToast('ჩეკ-აუთი წარმატებით შესრულდა', 'success')
    } catch (err: any) {
      showToast(err.error || 'ჩეკ-აუთი ვერ შესრულდა', 'error')
    }
  }

  const content = (
    <div className="fixed inset-0 z-50 flex items-end md:justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-bg-primary w-full md:w-[450px] md:h-full max-h-[85vh] md:max-h-full rounded-t-2xl md:rounded-none shadow-2xl flex flex-col animate-in slide-in-from-bottom md:slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-text-primary truncate">{itemName}</h3>
            <p className="text-xs text-text-tertiary">
              ჩეკ-ინი
              {(column.config as Record<string, any>)?.service
                ? ` — ${(column.config as Record<string, any>).service}`
                : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* GPS Status */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-bg-secondary">
            {coords ? (
              <>
                <Navigation className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-500 font-medium">GPS აქტიურია</span>
                <span className="text-xs text-text-tertiary ml-auto">±{coords.accuracy}მ</span>
              </>
            ) : gpsError ? (
              <>
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600">{gpsError}</span>
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 text-text-tertiary animate-spin" />
                <span className="text-sm text-text-secondary">GPS სიგნალის მოლოდინში...</span>
              </>
            )}
          </div>

          {/* Geofence info */}
          {targetCoords && coords && distance !== null && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${withinRadius ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}
            >
              <MapPin className={`w-4 h-4 ${withinRadius ? 'text-green-500' : 'text-red-500'}`} />
              <span
                className={`text-sm font-medium ${withinRadius ? 'text-green-500' : 'text-red-500'}`}
              >
                {distance}მ
              </span>
              <span className={`text-xs ${withinRadius ? 'text-green-500' : 'text-red-500'}`}>
                {withinRadius
                  ? `რადიუსში (${RADIUS_METERS}მ)`
                  : `რადიუსის გარეთ (საჭიროა ${RADIUS_METERS}მ)`}
              </span>
            </div>
          )}

          {!targetCoords && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <Navigation className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-blue-500">
                GPS-ის რეჟიმი — კოორდინატების შემოწმების გარეშე
              </span>
            </div>
          )}

          {/* Active checkin or Check-in form */}
          {activeCheckin ? (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-sm font-semibold text-orange-500">აქტიური ჩეკ-ინი</span>
                </div>
                <div className="text-3xl font-mono font-bold text-orange-500 mb-2">
                  {elapsedDisplay}
                </div>
                {activeCheckin.inspector_name && (
                  <div className="flex items-center gap-1.5 text-sm text-orange-500">
                    <User className="w-3.5 h-3.5" />
                    {activeCheckin.inspector_name}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={!coords || checkout.isPending}
                className="w-full py-3 px-4 rounded-xl bg-red-600 text-white font-semibold text-base hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {checkout.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <XCircle className="w-5 h-5" />
                    ჩეკ-აუთი
                  </>
                )}
              </button>
              {!coords && (
                <p className="text-xs text-text-tertiary text-center">
                  GPS სიგნალის მოლოდინში ჩეკ-აუთისთვის...
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {othersActiveCheckin && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse flex-shrink-0" />
                  <span className="text-sm text-orange-500">
                    {othersActiveCheckin.inspector_name || 'სხვა ინსპექტორი'} ამჟამად ჩექინშია ამ
                    ლოკაციაზე
                  </span>
                </div>
              )}
              {visitTypes.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    ვიზიტის ტიპი <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={checkinType}
                    onChange={e => setCheckinType(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-bg-primary text-text-primary border border-border-light rounded-lg focus:outline-none focus:border-monday-primary"
                  >
                    <option value="">აირჩიეთ ვიზიტის ტიპი...</option>
                    {visitTypes.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="შენიშვნა (არასავალდებულო)"
                maxLength={2000}
                rows={2}
                className="w-full px-3 py-2 text-sm bg-bg-primary border border-border-light rounded-lg resize-none focus:outline-none focus:border-monday-primary text-text-primary placeholder-text-tertiary"
              />
              <button
                type="button"
                onClick={handleCheckin}
                disabled={!canCheckin}
                className="w-full py-3 px-4 rounded-xl bg-green-600 text-white font-semibold text-base hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {createCheckin.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    ჩეკ-ინი
                  </>
                )}
              </button>
            </div>
          )}

          {/* Timeline */}
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 text-text-tertiary animate-spin" />
            </div>
          ) : checkins.length > 0 ? (
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">
                ისტორია ({checkins.length})
              </h4>
              {checkins.map((c: LocationCheckin) => (
                <CheckinTimelineEntry key={c.id} checkin={c} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

function CheckinTimelineEntry({ checkin }: { checkin: LocationCheckin }) {
  const isActive = !checkin.checked_out_at
  const d = new Date(checkin.created_at)
  const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-bg-hover transition-colors">
      <div className="flex-shrink-0">
        {isActive ? (
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse block" />
        ) : checkin.location_match ? (
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        ) : checkin.location_match === false ? (
          <XCircle className="w-4 h-4 text-red-500" />
        ) : (
          <Clock className="w-4 h-4 text-text-tertiary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-primary font-medium truncate">
            {checkin.inspector_name || 'Unknown'}
          </span>
          <span className="text-xs text-text-tertiary flex-shrink-0">{dateStr}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          {checkin.checkin_type && (
            <span className="px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary flex-shrink-0">
              {checkin.checkin_type}
            </span>
          )}
          {isActive ? (
            <span className="text-orange-600 font-medium">აქტიური</span>
          ) : (
            <>
              {checkin.duration_minutes != null && (
                <span className="flex items-center gap-0.5">
                  <Timer className="w-3 h-3" />
                  {formatDuration(checkin.duration_minutes)}
                </span>
              )}
              {checkin.distance_from_location != null && (
                <span
                  className="flex items-center gap-0.5"
                  title="მანძილი ობიექტის კოორდინატებიდან ჩეკ-ინისას"
                >
                  <MapPin className="w-3 h-3" />
                  {checkin.distance_from_location}მ
                </span>
              )}
              {checkin.checkout_distance != null && (
                <span title="მანძილი ჩეკ-ინის ადგილიდან ჩეკ-აუთისას">
                  გადაადგილება: {checkin.checkout_distance}მ
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
