'use client'

import { createPortal } from 'react-dom'
import { AlertCircle, MapPin } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useToast } from '@/components/ui-monday/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { dayKey } from '../../lib/week'
import type { Board } from '@/types/board'
import { useWeekPlanAction } from '../../hooks/useWeekPlan'
import { useWeeklyPlan } from './useWeeklyPlan'
import { PlannerHeader } from './PlannerHeader'
import { DayCard } from './DayCard'
import { ExecutionPanels } from './ExecutionPanels'
import { CompanyPool } from './CompanyPool'
import { PlannerFooter } from './PlannerFooter'
import { DayRouteMapModal } from './DayRouteMapModal'
import { WeekComments } from '../WeekComments'

interface WeeklyPlannerProps {
  board: Board
  onClose: () => void
}

export function WeeklyPlanner({ board, onClose }: WeeklyPlannerProps) {
  const t = useTranslations()
  const { showToast } = useToast()
  const { isAdmin, isDispatcher } = useAuth()
  const isManager = isAdmin || isDispatcher
  // Officers plan only NEXT week and can't switch weeks; managers browse freely.
  const c = useWeeklyPlan(board, { initialWeekOffset: isManager ? 0 : 1 })
  const submit = useWeekPlanAction()

  // Send the plan to the admin for approval (optimize + save, then submit).
  const handleSubmit = async () => {
    if (c.totalCompanies === 0) return
    await c.handlePlanWeek()
    try {
      await submit.mutateAsync({
        inspectorId: c.inspectorId,
        weekStart: c.weekStartKey,
        action: 'submit',
      })
      showToast(t('officerPlan.sent'), 'success')
    } catch (err: any) {
      showToast(err?.error || t('officerPlan.sendFailed'), 'error')
    }
  }

  const content = (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-primary">
      <PlannerHeader
        boardName={board.name}
        days={c.days}
        canNavigate={isManager}
        onPrevWeek={() => c.setWeekOffset(w => w - 1)}
        onNextWeek={() => c.setWeekOffset(w => w + 1)}
        onClose={onClose}
      />

      {c.routable && !c.start && (
        <div className="flex items-center gap-2 px-5 py-2 bg-orange-500/10 border-b border-orange-500/30 text-sm text-orange-500 flex-shrink-0">
          <AlertCircle className="w-4 h-4" />
          {t('routing.setStartFirst')}
        </div>
      )}

      {!c.routable ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center px-6 gap-3">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">{t('routing.noLocationTitle')}</p>
            <p className="text-xs text-text-tertiary mt-1 max-w-sm">
              {t('routing.noLocationHint')}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
            {/* Week grid + execution panels */}
            <div className="p-4 lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {c.days.map((d, i) => {
                  const key = dayKey(d)
                  return (
                    <DayCard
                      key={key}
                      date={d}
                      dayIndex={i}
                      ids={c.assignments[key] || []}
                      result={c.dayResults[key]}
                      isSelected={i === c.selectedDay}
                      saving={c.savingDay === key}
                      nameOf={c.nameOf}
                      coordsOf={c.coordsOf}
                      start={c.start}
                      onSelect={() => c.setSelectedDay(i)}
                      onRemove={id => c.removeFromDay(key, id)}
                      onSaveDay={() => c.saveDay(key)}
                      onViewMap={() => c.setMapDayKey(key)}
                    />
                  )
                })}
              </div>

              {c.execution && (
                <ExecutionPanels
                  execution={c.execution}
                  extraVisits={c.extraVisits}
                  isCurrentWeek={c.isCurrentWeek}
                  todayIndex={c.todayIndex}
                  addingUnplanned={c.addingUnplanned}
                  unplannedCandidates={c.unplannedCandidates}
                  onToggleAdding={() => c.setAddingUnplanned(v => !v)}
                  onAddExtra={c.addExtraVisit}
                  onRemoveExtra={c.removeExtraVisit}
                />
              )}

              {/* Plan comments — officer & managers can discuss the week */}
              {c.inspectorId && (
                <div className="mt-4">
                  <WeekComments inspectorId={c.inspectorId} weekStart={c.weekStartKey} />
                </div>
              )}
            </div>

            <CompanyPool
              items={c.items}
              isLoading={c.isLoading}
              selectedDay={c.selectedDay}
              dayOfItem={c.dayOfItem}
              hasCoords={id => !!c.coordsOf(id)}
              geocodable={c.geocodable}
              geocoding={c.geocoding}
              geoProgress={c.geoProgress}
              onToggle={c.toggleItemOnSelectedDay}
              onGeocode={c.geocodeAddresses}
            />
          </div>

          <PlannerFooter
            totalCompanies={c.totalCompanies}
            totalKm={c.totalKm}
            fuelLiters={c.fuelLiters}
            planningWeek={c.planningWeek}
            onPlanWeek={c.handlePlanWeek}
            planStatus={c.planStatus}
            onSubmit={handleSubmit}
            submitting={submit.isPending}
          />
        </>
      )}

      {c.mapDayKey && (
        <DayRouteMapModal
          dayKeyValue={c.mapDayKey}
          days={c.days}
          monday={c.monday}
          result={c.dayResults[c.mapDayKey]}
          ids={c.assignments[c.mapDayKey] || []}
          coordsOf={c.coordsOf}
          nameOf={c.nameOf}
          consumption={c.transport?.consumption_l_per_100km ?? null}
          start={c.start}
          onClose={() => c.setMapDayKey(null)}
        />
      )}
    </div>
  )

  return createPortal(content, document.body)
}
