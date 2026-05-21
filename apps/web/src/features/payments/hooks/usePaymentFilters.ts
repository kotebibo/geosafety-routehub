import { useState, useEffect, useMemo } from 'react'

import { getMonthRange, monthsBetween } from '../helpers'

export function usePaymentFilters() {
  const now = new Date()

  // Month navigation
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number | null>(now.getMonth())

  // Pagination
  const [page, setPage] = useState(1)
  const limit = 50

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [matchSourceFilter, setMatchSourceFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Grouping
  const [groupByCompany, setGroupByCompany] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Debounce search for server-side filtering
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(searchQuery), 350)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Compute date range from month selection or custom dates
  const effectiveDateRange = useMemo(() => {
    if (dateFrom || dateTo) {
      return { from: dateFrom || undefined, to: dateTo || undefined }
    }
    if (selectedMonth === null) {
      // All history — no date bounds
      return { from: undefined, to: undefined }
    }
    return getMonthRange(selectedYear, selectedMonth)
  }, [selectedYear, selectedMonth, dateFrom, dateTo])

  // How many months the current view covers (for expected amount calculation)
  const monthsInRange = useMemo(() => {
    const { from, to } = effectiveDateRange
    if (from && to) return monthsBetween(from, to)
    return 0 // "all" mode — getExpectedForPeriod handles this
  }, [effectiveDateRange])

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
    setExpandedGroups(new Set())
  }, [
    statusFilter,
    matchSourceFilter,
    selectedMonth,
    selectedYear,
    dateFrom,
    dateTo,
    searchDebounced,
  ])

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const navigateMonth = (delta: number) => {
    setDateFrom('')
    setDateTo('')
    if (selectedMonth === null) {
      // From "all" view, go to Dec (prev) or Jan (next)
      setSelectedMonth(delta < 0 ? 11 : 0)
      if (delta < 0) setSelectedYear(y => y - 1)
      return
    }
    let m = selectedMonth + delta
    let y = selectedYear
    if (m < 0) {
      m = 11
      y--
    }
    if (m > 11) {
      m = 0
      y++
    }
    setSelectedMonth(m)
    setSelectedYear(y)
  }

  const clearDateFilter = () => {
    setDateFrom('')
    setDateTo('')
  }

  // Year options for dropdown
  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

  const totalPages = groupByCompany ? 1 : Math.ceil(1 / limit) // recalculated with actual total in page

  return {
    // Month/year
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    yearOptions,
    navigateMonth,

    // Pagination
    page,
    setPage,
    limit,

    // Filters
    statusFilter,
    setStatusFilter,
    matchSourceFilter,
    setMatchSourceFilter,
    searchQuery,
    setSearchQuery,
    searchDebounced,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    clearDateFilter,

    // Grouping
    groupByCompany,
    setGroupByCompany,
    expandedGroups,
    toggleGroup,

    // Computed
    effectiveDateRange,
    monthsInRange,
  }
}
