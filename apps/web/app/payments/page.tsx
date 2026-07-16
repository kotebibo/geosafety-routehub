'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { useAuth } from '@/contexts/AuthContext'
import { AlertCircle, Download } from 'lucide-react'

import {
  PaymentStatsCards,
  PaymentFilters,
  PaymentMonthTabs,
  PaymentTable,
} from '@/features/payments/components'
import {
  usePaymentFilters,
  usePaymentData,
  usePaymentStats,
  useGroupedTransactions,
} from '@/features/payments/hooks'
import { exportTransactionsCSV } from '@/features/payments/helpers'

export default function PaymentsPage() {
  const router = useRouter()
  const t = useTranslations()
  const { isAdmin, isDispatcher, loading: authLoading } = useAuth()

  const filters = usePaymentFilters()

  const data = usePaymentData({
    statusFilter: filters.statusFilter,
    matchSourceFilter: filters.matchSourceFilter,
    effectiveDateRange: filters.effectiveDateRange,
    searchDebounced: filters.searchDebounced,
    page: filters.page,
    limit: filters.limit,
    groupByCompany: filters.groupByCompany,
    isAuthorized: isAdmin || isDispatcher,
    authLoading,
  })

  const { monthStats, tableTotals } = usePaymentStats({
    transactions: data.transactions,
    contracts: data.contracts,
    loading: data.loading,
    contractsLoading: data.contractsLoading,
    monthsInRange: filters.monthsInRange,
    effectiveDateRange: filters.effectiveDateRange,
    matchSourceFilter: filters.matchSourceFilter,
  })

  const { grouped } = useGroupedTransactions({
    transactions: data.transactions,
    contracts: data.contracts,
    contractsLoading: data.contractsLoading,
    groupByCompany: filters.groupByCompany,
    monthsInRange: filters.monthsInRange,
    effectiveDateRange: filters.effectiveDateRange,
    selectedMonth: filters.selectedMonth,
    statusFilter: filters.statusFilter,
    matchSourceFilter: filters.matchSourceFilter,
    searchQuery: filters.searchDebounced,
  })

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAdmin && !isDispatcher) {
      router.push('/')
    }
  }, [authLoading, isAdmin, isDispatcher, router])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-monday-primary" />
      </div>
    )
  }

  const totalPages = filters.groupByCompany ? 1 : Math.ceil(data.total / filters.limit)

  const handleExportCSV = () => {
    exportTransactionsCSV(
      data.transactions,
      data.contracts,
      filters.monthsInRange,
      filters.effectiveDateRange,
      filters.matchSourceFilter,
      filters.selectedYear,
      filters.selectedMonth
    )
  }

  const handleNavigateToBoard = (boardId: string, itemId?: string) => {
    router.push(`/boards/${boardId}${itemId ? `?item=${itemId}` : ''}`)
  }

  const handleNavigateUnmatched = () => {
    router.push('/payments/unmatched')
  }

  return (
    <div className="p-6 space-y-5 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('payments.title')}</h1>
          <p className="text-sm text-text-secondary mt-0.5">{t('payments.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-primary text-text-secondary border border-border-light hover:bg-bg-secondary transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            {t('payments.exportCsv')}
          </button>
          <button
            onClick={handleNavigateUnmatched}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors text-sm font-medium"
          >
            <AlertCircle className="w-4 h-4" />
            {t('payments.unmatchedButton', { count: data.stats?.unmatched_count || 0 })}
          </button>
        </div>
      </div>

      {/* Month Tabs */}
      <PaymentMonthTabs
        selectedYear={filters.selectedYear}
        selectedMonth={filters.selectedMonth}
        yearOptions={filters.yearOptions}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        onNavigateMonth={filters.navigateMonth}
        onSelectMonth={filters.setSelectedMonth}
        onSelectYear={filters.setSelectedYear}
        onClearDateFilter={filters.clearDateFilter}
      />

      {/* Stats Cards */}
      <PaymentStatsCards
        monthStats={monthStats}
        loading={data.loading}
        contractsLoading={data.contractsLoading}
      />

      {/* Filters Bar */}
      <PaymentFilters
        searchQuery={filters.searchQuery}
        onSearchChange={filters.setSearchQuery}
        statusFilter={filters.statusFilter}
        onStatusFilterChange={filters.setStatusFilter}
        matchSourceFilter={filters.matchSourceFilter}
        onMatchSourceFilterChange={filters.setMatchSourceFilter}
        dateFrom={filters.dateFrom}
        onDateFromChange={filters.setDateFrom}
        dateTo={filters.dateTo}
        onDateToChange={filters.setDateTo}
        onClearDateFilter={filters.clearDateFilter}
        groupByCompany={filters.groupByCompany}
        onGroupByCompanyToggle={() => filters.setGroupByCompany(!filters.groupByCompany)}
      />

      {/* Transactions Table */}
      <PaymentTable
        loading={data.loading}
        transactions={data.transactions}
        grouped={grouped}
        groupByCompany={filters.groupByCompany}
        expandedGroups={filters.expandedGroups}
        contracts={data.contracts}
        contractsLoading={data.contractsLoading}
        monthsInRange={filters.monthsInRange}
        effectiveDateRange={filters.effectiveDateRange}
        matchSourceFilter={filters.matchSourceFilter}
        tableTotals={tableTotals}
        copiedId={data.copiedId}
        actionLoading={data.actionLoading}
        page={filters.page}
        total={data.total}
        limit={filters.limit}
        totalPages={totalPages}
        onPageChange={filters.setPage}
        onToggleGroup={filters.toggleGroup}
        onCopy={data.handleCopy}
        onIgnore={data.handleIgnore}
        onUnignore={data.handleUnignore}
        onNavigateToBoard={handleNavigateToBoard}
        onNavigateUnmatched={handleNavigateUnmatched}
      />
    </div>
  )
}
