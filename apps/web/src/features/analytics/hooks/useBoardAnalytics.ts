import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { boardAnalyticsService } from '@/services/board-analytics.service'

export function useBoardAnalytics() {
  // Stage 1: Load all three source boards
  const companiesQuery = useQuery({
    queryKey: ['board-analytics', 'companies-board'],
    queryFn: () => boardAnalyticsService.loadCompaniesBoard(),
    staleTime: 5 * 60 * 1000,
  })

  const locationsQuery = useQuery({
    queryKey: ['board-analytics', 'locations-board'],
    queryFn: () => boardAnalyticsService.loadLocationsBoard(),
    staleTime: 5 * 60 * 1000,
  })

  const summaryQuery = useQuery({
    queryKey: ['board-analytics', 'summary-board'],
    queryFn: () => boardAnalyticsService.loadSummaryBoard(),
    staleTime: 5 * 60 * 1000,
  })

  const companies = companiesQuery.data || []
  const locations = locationsQuery.data || { items: [], groups: [] }
  const summaryRows = summaryQuery.data || []

  const isLoading = companiesQuery.isLoading || locationsQuery.isLoading || summaryQuery.isLoading

  // Derived data - computed client-side from loaded boards
  const globalKPIs = useMemo(
    () =>
      companies.length > 0 ? boardAnalyticsService.getGlobalKPIs(companies, locations.items) : null,
    [companies, locations.items]
  )

  // Finance tab
  const serviceTypeRevenue = useMemo(
    () => boardAnalyticsService.getServiceTypeRevenue(companies),
    [companies]
  )
  const monthlyTrend = useMemo(() => boardAnalyticsService.getMonthlyTrend(companies), [companies])
  const paymentMethods = useMemo(
    () => boardAnalyticsService.getPaymentMethodBreakdown(companies),
    [companies]
  )
  const topCompanies = useMemo(
    () => boardAnalyticsService.getTopCompanies(companies, 10),
    [companies]
  )

  // Inspectors tab
  const inspectorSummaries = useMemo(
    () => boardAnalyticsService.getInspectorSummaries(summaryRows),
    [summaryRows]
  )
  const inspectorScatter = useMemo(
    () => boardAnalyticsService.getInspectorScatter(summaryRows),
    [summaryRows]
  )
  const topLocations = useMemo(
    () => boardAnalyticsService.getTopLocations(locations.items, locations.groups, 15),
    [locations]
  )

  // Companies tab
  const expiringContracts = useMemo(
    () => boardAnalyticsService.getExpiringContracts(companies, locations.items, locations.groups),
    [companies, locations]
  )
  const expiryTimeline = useMemo(
    () => boardAnalyticsService.getExpiryTimeline(companies),
    [companies]
  )
  const valueBuckets = useMemo(() => boardAnalyticsService.getValueBuckets(companies), [companies])
  const companyTable = useMemo(() => boardAnalyticsService.getCompanyTable(companies), [companies])
  const activityBreakdown = useMemo(
    () => boardAnalyticsService.getActivityBreakdown(companies),
    [companies]
  )

  // Forecast tab
  const revenueForecast = useMemo(
    () => (companies.length > 0 ? boardAnalyticsService.getRevenueForecast(companies) : null),
    [companies]
  )

  return {
    isLoading,
    globalKPIs,
    // Finance
    serviceTypeRevenue,
    monthlyTrend,
    paymentMethods,
    topCompanies,
    // Inspectors
    inspectorSummaries,
    inspectorScatter,
    topLocations,
    // Companies
    expiringContracts,
    expiryTimeline,
    valueBuckets,
    companyTable,
    activityBreakdown,
    // Forecast
    revenueForecast,
  }
}
