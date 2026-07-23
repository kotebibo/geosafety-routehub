'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  MapPin,
  Navigation,
  Loader2,
  Route as RouteIcon,
  ExternalLink,
  AlertCircle,
  Check,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useBoardColumns } from '@/features/boards/hooks/useBoardColumns'
import { parseCoordinates } from '@/lib/geo-utils'
import { useToast } from '@/components/ui-monday/Toast'
import { useInspectorLocation } from '../hooks/useInspectorLocation'
import { resolveLocationColumns } from '../lib/location-columns'
import { useRouteOptimizer, type OptimizedRouteResult } from '../hooks/useRouteOptimizer'
import type { RoutingItem } from '../hooks/useRoutingData'
import type { Board } from '@/types/board'

interface RoutePlanningPopupProps {
  board: Board
  items: RoutingItem[]
  onClose: () => void
}

export function RoutePlanningPopup({ board, items, onClose }: RoutePlanningPopupProps) {
  const t = useTranslations()
  const { showToast } = useToast()
  const { start } = useInspectorLocation(board)
  const { data: columns = [] } = useBoardColumns(board.board_type, board.id)
  const optimizer = useRouteOptimizer()
  const [result, setResult] = useState<OptimizedRouteResult | null>(null)

  // Where each item stores coords — explicit check-in config, else auto-detected
  // by column name (a check-in column is not required).
  const coordsColumnId = useMemo(() => resolveLocationColumns(columns).coordsColumnId, [columns])

  // Resolve each selected company to coordinates; split into usable / missing
  const { located, missing } = useMemo(() => {
    const located: { item: RoutingItem; lat: number; lng: number }[] = []
    const missing: RoutingItem[] = []
    for (const ri of items) {
      const raw = coordsColumnId ? ri.item.data?.[coordsColumnId] : null
      const coords = parseCoordinates(raw)
      if (coords) located.push({ item: ri, ...coords })
      else missing.push(ri)
    }
    return { located, missing }
  }, [items, coordsColumnId])

  const canOptimize = !!start && located.length >= 1

  // Optimize once columns are loaded and we have a start + at least one stop
  useEffect(() => {
    if (!canOptimize || !start || result || optimizer.isPending) return
    const locations = [
      { id: 'start', name: t('routing.startPoint'), lat: start.lat, lng: start.lng },
      ...located.map(l => ({ id: l.item.item.id, name: l.item.item.name, lat: l.lat, lng: l.lng })),
    ]
    optimizer
      .mutateAsync(locations)
      .then(setResult)
      .catch((err: any) => {
        showToast(err.error || t('routing.optimizeFailed'), 'error')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canOptimize, start, located.length])

  // Ordered stops excluding the start marker (index 0)
  const companyStops = useMemo(() => result?.stops.filter(s => s.id !== 'start') ?? [], [result])
  const startToFirst = companyStops[0]?.distanceFromPrevious ?? null

  const googleMapsUrl = useMemo(() => {
    if (!result || !start) return null
    const pts = [`${start.lat},${start.lng}`, ...companyStops.map(s => `${s.lat},${s.lng}`)]
    return `https://www.google.com/maps/dir/${pts.join('/')}`
  }, [result, start, companyStops])

  const handleSaveDraft = () => {
    if (!result || !start) return
    const draft = {
      savedAt: new Date().toISOString(),
      boardId: board.id,
      start,
      totalDistance: result.totalDistance,
      stops: companyStops.map(s => ({
        id: s.id,
        name: s.name,
        position: s.position,
        distanceFromPrevious: s.distanceFromPrevious,
      })),
    }
    localStorage.setItem(`routehub-route-draft-${board.id}`, JSON.stringify(draft))
    showToast(t('routing.draftSaved'), 'success')
  }

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-bg-primary w-full max-w-lg max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border-light">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-monday-primary/10 flex items-center justify-center flex-shrink-0">
              <RouteIcon className="w-4 h-4 text-monday-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-text-primary truncate">
                {t('routing.planRoute')}
              </h3>
              <p className="text-xs text-text-tertiary truncate">{board.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {/* No start location */}
          {!start && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
              <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-orange-500">{t('routing.setStartFirst')}</p>
            </div>
          )}

          {/* Companies without coordinates */}
          {missing.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-secondary">
              <AlertCircle className="w-4 h-4 text-text-tertiary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-text-secondary">
                {t('routing.missingCoords', { count: missing.length })}
              </p>
            </div>
          )}

          {/* Loading */}
          {optimizer.isPending && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 text-text-tertiary animate-spin" />
              <span className="ml-2 text-sm text-text-secondary">{t('routing.optimizing')}</span>
            </div>
          )}

          {/* Result */}
          {result && !optimizer.isPending && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-2">
                <SummaryTile
                  label={t('routing.totalDistance')}
                  value={`${result.totalDistance.toFixed(1)} ${t('routing.km')}`}
                />
                <SummaryTile
                  label={t('routing.toFirstStop')}
                  value={
                    startToFirst !== null ? `${startToFirst.toFixed(1)} ${t('routing.km')}` : '—'
                  }
                />
                <SummaryTile label={t('routing.stops')} value={String(companyStops.length)} />
              </div>

              <p className="text-[11px] text-text-tertiary">
                {result.metadata.usingRealRoads
                  ? t('routing.viaRoads')
                  : t('routing.viaStraightLine')}
                {result.improvement > 0 &&
                  ` · ${t('routing.improved', { pct: Math.round(result.improvement) })}`}
              </p>

              {/* Ordered stop list */}
              <div className="space-y-1.5">
                {/* Start */}
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-green-500/5 border border-green-500/20">
                  <div className="w-6 h-6 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                    <Navigation className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">
                      {t('routing.startPoint')}
                    </p>
                    <p className="text-xs text-text-tertiary truncate">
                      {start?.address || `${start?.lat.toFixed(4)}, ${start?.lng.toFixed(4)}`}
                    </p>
                  </div>
                </div>

                {companyStops.map((stop, i) => (
                  <div
                    key={stop.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-bg-hover transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-monday-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{stop.name}</p>
                    </div>
                    <span className="text-xs text-text-tertiary flex-shrink-0">
                      +{stop.distanceFromPrevious.toFixed(1)} {t('routing.km')}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        {result && !optimizer.isPending && (
          <div className="flex items-center gap-2 px-5 py-3 border-t border-border-light">
            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-monday-primary hover:bg-bg-hover transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                {t('routing.openInMaps')}
              </a>
            )}
            <button
              type="button"
              onClick={handleSaveDraft}
              className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-monday-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Check className="w-4 h-4" />
              {t('routing.saveDraft')}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-bg-secondary text-center">
      <p className="text-sm font-bold text-text-primary">{value}</p>
      <p className="text-[11px] text-text-tertiary mt-0.5">{label}</p>
    </div>
  )
}
