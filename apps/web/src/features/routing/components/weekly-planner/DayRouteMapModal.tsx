'use client'

import { useTranslations } from 'next-intl'
import { RouteMapModal, type RouteMapStop } from '../RouteMapModal'
import { dayKey, shortDate, DAY_LABELS_KA } from '../../lib/week'
import type { DayResult } from './types'

interface DayRouteMapModalProps {
  dayKeyValue: string
  days: Date[]
  monday: Date
  result: DayResult | undefined
  ids: string[]
  coordsOf: (itemId: string) => { lat: number; lng: number } | null
  nameOf: (itemId: string) => string
  consumption: number | null
  start: { lat: number; lng: number } | null
  onClose: () => void
}

export function DayRouteMapModal({
  dayKeyValue,
  days,
  monday,
  result,
  ids,
  coordsOf,
  nameOf,
  consumption,
  start,
  onClose,
}: DayRouteMapModalProps) {
  const t = useTranslations()

  const distanceByItem = new Map((result?.stops ?? []).map(s => [s.itemId, s.distanceFromPrevious]))
  const stops: RouteMapStop[] = ids
    .map((id): RouteMapStop | null => {
      const c = coordsOf(id)
      return c
        ? {
            id,
            name: nameOf(id),
            lat: c.lat,
            lng: c.lng,
            distanceKm: distanceByItem.get(id) ?? null,
          }
        : null
    })
    .filter((s): s is RouteMapStop => s !== null)

  const km = result?.km ?? 0
  const fuel = consumption != null && km > 0 ? (km * consumption) / 100 : null
  const idx = days.findIndex(d => dayKey(d) === dayKeyValue)
  const title = `${DAY_LABELS_KA[idx] ?? ''} ${shortDate(days[idx] ?? monday)}`

  return (
    <RouteMapModal
      title={title}
      km={km}
      returnKm={result?.returnKm}
      fuelLiters={fuel}
      stops={stops}
      start={start ? { lat: start.lat, lng: start.lng, name: t('routing.startPoint') } : undefined}
      consumption={consumption}
      geometry={result?.geometry}
      onClose={onClose}
    />
  )
}
