import { useQuery } from '@tanstack/react-query'
import { boardAnalyticsService } from '@/services/board-analytics.service'

export function useBoardAnalytics() {
  const kpis = useQuery({
    queryKey: ['board-analytics', 'kpis'],
    queryFn: () => boardAnalyticsService.getKPIs(),
    staleTime: 5 * 60 * 1000,
  })

  const inspectorRevenue = useQuery({
    queryKey: ['board-analytics', 'inspector-revenue'],
    queryFn: () => boardAnalyticsService.getInspectorRevenue(),
    staleTime: 5 * 60 * 1000,
    enabled: !kpis.isLoading,
  })

  const topLocations = useQuery({
    queryKey: ['board-analytics', 'top-locations'],
    queryFn: () => boardAnalyticsService.getTopLocations(15),
    staleTime: 5 * 60 * 1000,
    enabled: !kpis.isLoading,
  })

  return {
    kpis,
    inspectorRevenue,
    topLocations,
    isLoading: kpis.isLoading,
  }
}
