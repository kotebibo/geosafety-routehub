'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/react-query'
import { analyticsService } from '@/services/analytics.service'

export function useAnalytics() {
  // Stage 1: KPIs + route status (lightweight count queries)
  const kpis = useQuery({
    queryKey: queryKeys.analytics.kpis(),
    queryFn: analyticsService.getKPIs,
    staleTime: 60 * 1000,
  })

  const routeStatus = useQuery({
    queryKey: queryKeys.analytics.routeStatus(),
    queryFn: analyticsService.getRouteStatusBreakdown,
    staleTime: 5 * 60 * 1000,
  })

  // Stage 2: Load after KPIs are done
  const kpisReady = !kpis.isLoading

  const routesByDay = useQuery({
    queryKey: queryKeys.analytics.routesByDay(30),
    queryFn: () => analyticsService.getRoutesByDay(30),
    staleTime: 5 * 60 * 1000,
    enabled: kpisReady,
  })

  const overdueInspections = useQuery({
    queryKey: queryKeys.analytics.overdueInspections(),
    queryFn: analyticsService.getOverdueInspections,
    staleTime: 5 * 60 * 1000,
    enabled: kpisReady,
  })

  // Stage 3: Heavier queries load last
  const stage2Ready = kpisReady && !routesByDay.isLoading

  const inspectorWorkload = useQuery({
    queryKey: queryKeys.analytics.inspectorWorkload(),
    queryFn: analyticsService.getInspectorWorkload,
    staleTime: 5 * 60 * 1000,
    enabled: stage2Ready,
  })

  const topCompanies = useQuery({
    queryKey: queryKeys.analytics.topCompanies(10),
    queryFn: () => analyticsService.getTopCompanies(10),
    staleTime: 5 * 60 * 1000,
    enabled: stage2Ready,
  })

  const weeklyDistance = useQuery({
    queryKey: queryKeys.analytics.weeklyDistance(8),
    queryFn: () => analyticsService.getWeeklyDistance(8),
    staleTime: 5 * 60 * 1000,
    enabled: stage2Ready,
  })

  return {
    kpis,
    routesByDay,
    inspectorWorkload,
    routeStatus,
    topCompanies,
    overdueInspections,
    weeklyDistance,
    isLoading: kpis.isLoading || routesByDay.isLoading,
  }
}
