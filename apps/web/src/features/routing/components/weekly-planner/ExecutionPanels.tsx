'use client'

import { AlertTriangle, MapPin, Plus, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { shortDateStr } from '../../lib/week'
import type { WeekExecution } from '../../hooks/useWeekExecution'
import type { RoutingItem } from '../../hooks/useRoutingData'
import type { ExtraVisit } from './types'

interface ExecutionPanelsProps {
  execution: WeekExecution
  extraVisits: ExtraVisit[]
  isCurrentWeek: boolean
  todayIndex: number
  addingUnplanned: boolean
  unplannedCandidates: RoutingItem[]
  onToggleAdding: () => void
  onAddExtra: (itemId: string) => void
  onRemoveExtra: (itemId: string) => void
}

export function ExecutionPanels({
  execution,
  extraVisits,
  isCurrentWeek,
  todayIndex,
  addingUnplanned,
  unplannedCandidates,
  onToggleAdding,
  onAddExtra,
  onRemoveExtra,
}: ExecutionPanelsProps) {
  const t = useTranslations()
  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Unplanned / extra visits — each is its own home→object route */}
      <div className="rounded-xl border border-border-light bg-bg-primary p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <MapPin className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-semibold text-text-primary">
            {t('routing.unplannedVisits')}
          </span>
          <span className="text-xs text-text-tertiary">{extraVisits.length}</span>
          {/* Ad-hoc add — current week only */}
          {isCurrentWeek && todayIndex >= 0 && (
            <button
              type="button"
              onClick={onToggleAdding}
              className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-orange-500/10 text-orange-500 border border-orange-500/30 hover:bg-orange-500/20 transition-colors"
            >
              <Plus className="w-3 h-3" />
              {t('routing.addVisit')}
            </button>
          )}
        </div>
        {addingUnplanned && (
          <select
            defaultValue=""
            onChange={e => e.target.value && onAddExtra(e.target.value)}
            className="w-full mb-2 px-2 py-1.5 rounded-lg border border-border-light bg-bg-primary text-xs text-text-primary"
          >
            <option value="" disabled>
              {t('routing.pickObject')}
            </option>
            {unplannedCandidates.map(ri => (
              <option key={ri.item.id} value={ri.item.id}>
                {ri.item.name}
              </option>
            ))}
          </select>
        )}
        {extraVisits.length === 0 ? (
          <p className="text-xs text-text-tertiary py-1">{t('routing.noUnplannedVisits')}</p>
        ) : (
          <div className="space-y-1">
            {extraVisits.map((e, i) => (
              <div key={e.itemId} className="flex items-center gap-2 text-xs">
                <span className="w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-text-primary">{e.name}</span>
                <span className="text-[11px] text-text-tertiary flex-shrink-0">
                  {e.loading ? '…' : e.km != null ? `${e.km.toFixed(1)} ${t('routing.km')}` : '—'}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveExtra(e.itemId)}
                  className="text-text-tertiary hover:text-red-500 flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plan deviation — planned but not yet visited (after 21:00 of the day) */}
      <div className="rounded-xl border border-border-light bg-bg-primary p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-sm font-semibold text-text-primary">
            {t('routing.planDeviation')}
          </span>
          <span className="ml-auto text-xs text-text-tertiary">
            {execution.missedPlanned.length}
          </span>
        </div>
        {execution.missedPlanned.length === 0 ? (
          <p className="text-xs text-text-tertiary py-1">{t('routing.noDeviation')}</p>
        ) : (
          <div className="space-y-1">
            {execution.missedPlanned.map(v => (
              <div key={v.boardItemId} className="flex items-center gap-2 text-xs">
                <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
                <span className="flex-1 truncate text-text-primary">
                  {v.name || t('routing.unknownStop')}
                </span>
                {v.lateVisitedOn && (
                  <span className="text-[10px] font-medium text-amber-500 flex-shrink-0">
                    {t('routing.visitedLate', { date: shortDateStr(v.lateVisitedOn) })}
                  </span>
                )}
                <span className="text-[11px] text-text-tertiary flex-shrink-0">
                  {shortDateStr(v.date)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
