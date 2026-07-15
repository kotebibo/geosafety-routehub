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
  Trash2,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useGps } from '@/hooks/useGps'
import {
  useItemCheckins,
  useCreateItemCheckin,
  useCheckout,
  useDeleteCheckin,
} from '@/features/boards/hooks/useCheckinQueries'
import { parseCoordinates, haversineMeters, formatDuration, formatElapsed } from '@/lib/geo-utils'
import { getEffectiveVisitTypes, OTHER_VISIT_TYPE } from '@/features/boards/constants/checkin'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/shared/components/ui/select'
import { useToast } from '@/components/ui-monday/Toast'
import type { BoardColumn } from '@/types/board'
import type { LocationCheckin } from '@/types/checkin'

const RADIUS_METERS = 150

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
  const t = useTranslations()
  const { language } = useLanguage()
  const { user, userRole } = useAuth()
  const { coords, error: gpsError } = useGps(true)
  const { showToast } = useToast()
  const [notes, setNotes] = useState('')
  const [checkinType, setCheckinType] = useState('')
  const [elapsedDisplay, setElapsedDisplay] = useState('')
  const isAdmin = userRole?.role === 'admin'

  // Visit types come from the column config (custom list editable in Column
  // Settings, falling back to the service defaults); required when present,
  // since the stage automation is driven by the selection.
  // "სხვა" is always available but never updates the stage.
  const stageTypes = getEffectiveVisitTypes(column.config as Record<string, any>)
  const visitTypes = stageTypes.length > 0 ? [...stageTypes, OTHER_VISIT_TYPE] : []

  const { data: checkins = [], isLoading } = useItemCheckins(itemId, true)
  const createCheckin = useCreateItemCheckin(boardId)
  const checkout = useCheckout(boardId)
  const deleteCheckin = useDeleteCheckin(boardId)

  const handleDelete = async (checkinId: string) => {
    if (!confirm(t('checkin.confirmDelete'))) return
    try {
      await deleteCheckin.mutateAsync({ checkin_id: checkinId, board_item_id: itemId })
      showToast(t('checkin.deletedSuccess'), 'success')
    } catch (err: any) {
      showToast(err.error || t('checkin.deleteFailed'), 'error')
    }
  }

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
      showToast(t('checkin.checkinSuccess'), 'success')
    } catch (err: any) {
      showToast(err.error || t('checkin.checkinFailed'), 'error')
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
      showToast(t('checkin.checkoutSuccess'), 'success')
    } catch (err: any) {
      showToast(err.error || t('checkin.checkoutFailed'), 'error')
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
              {t('checkin.title')}
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
                <span className="text-sm text-green-500 font-medium">{t('checkin.gpsActive')}</span>
                <span className="text-xs text-text-tertiary ml-auto">
                  ±{coords.accuracy}
                  {t('checkin.meters')}
                </span>
              </>
            ) : gpsError ? (
              <>
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600">{gpsError}</span>
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 text-text-tertiary animate-spin" />
                <span className="text-sm text-text-secondary">{t('checkin.gpsWaiting')}</span>
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
                {distance}
                {t('checkin.meters')}
              </span>
              <span className={`text-xs ${withinRadius ? 'text-green-500' : 'text-red-500'}`}>
                {withinRadius
                  ? t('checkin.withinRadius', { radius: RADIUS_METERS })
                  : t('checkin.outsideRadius', { radius: RADIUS_METERS })}
              </span>
            </div>
          )}

          {!targetCoords && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <Navigation className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-blue-500">{t('checkin.noCoordsMode')}</span>
            </div>
          )}

          {/* Active checkin or Check-in form */}
          {activeCheckin ? (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-sm font-semibold text-orange-500">
                    {t('checkin.activeCheckin')}
                  </span>
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
                    {t('checkin.checkout')}
                  </>
                )}
              </button>
              {!coords && (
                <p className="text-xs text-text-tertiary text-center">
                  {t('checkin.waitingForGpsCheckout')}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {othersActiveCheckin && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse flex-shrink-0" />
                  <span className="text-sm text-orange-500">
                    {t('checkin.othersActive', {
                      name: othersActiveCheckin.inspector_name || t('checkin.otherInspector'),
                    })}
                  </span>
                </div>
              )}
              {visitTypes.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    {t('checkin.visitType')} <span className="text-red-500">*</span>
                  </label>
                  <Select value={checkinType || undefined} onValueChange={setCheckinType}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('checkin.selectVisitType')} />
                    </SelectTrigger>
                    <SelectContent>
                      {visitTypes.map(t => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={t('checkin.notesPlaceholder')}
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
                    {t('checkin.title')}
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
                {t('checkin.history', { count: checkins.length })}
              </h4>
              {checkins.map((c: LocationCheckin) => (
                <CheckinTimelineEntry
                  key={c.id}
                  checkin={c}
                  onDelete={isAdmin ? () => handleDelete(c.id) : undefined}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

function CheckinTimelineEntry({
  checkin,
  onDelete,
}: {
  checkin: LocationCheckin
  onDelete?: () => void
}) {
  const t = useTranslations()
  const { language } = useLanguage()
  const isActive = !checkin.checked_out_at
  const d = new Date(checkin.created_at)
  const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`

  return (
    <div className="group flex items-center gap-3 p-2.5 rounded-lg hover:bg-bg-hover transition-colors">
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
            {checkin.inspector_name || t('checkin.unknown')}
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
            <span className="text-orange-600 font-medium">{t('checkin.active')}</span>
          ) : (
            <>
              {checkin.duration_minutes != null && (
                <span className="flex items-center gap-0.5">
                  <Timer className="w-3 h-3" />
                  {formatDuration(checkin.duration_minutes, language)}
                </span>
              )}
              {checkin.distance_from_location != null && (
                <span
                  className="flex items-center gap-0.5"
                  title={t('checkin.distanceFromLocationTooltip')}
                >
                  <MapPin className="w-3 h-3" />
                  {checkin.distance_from_location}
                  {t('checkin.meters')}
                </span>
              )}
              {checkin.checkout_distance != null && (
                <span title={t('checkin.checkoutDistanceTooltip')}>
                  {t('checkin.movedDistance', { distance: checkin.checkout_distance })}
                </span>
              )}
            </>
          )}
        </div>
      </div>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          title={t('checkin.deleteTooltip')}
          className="flex-shrink-0 p-1.5 rounded-md md:opacity-0 md:group-hover:opacity-100 hover:bg-red-500/10 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
        </button>
      )}
    </div>
  )
}
