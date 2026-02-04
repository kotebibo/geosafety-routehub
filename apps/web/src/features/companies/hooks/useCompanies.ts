'use client'

import { useState, useEffect, useCallback } from 'react'
import { companiesService } from '@/services/companies.service'

interface PaginationState {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function useCompanies(initialPageSize = 50) {
  const [companies, setCompanies] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: initialPageSize,
    total: 0,
    totalPages: 0
  })

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset to page 1 when search changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [debouncedSearch])

  // Fetch companies when page or search changes
  useEffect(() => {
    fetchCompanies()
  }, [pagination.page, pagination.pageSize, debouncedSearch])

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      const result = await companiesService.getPaginated({
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: debouncedSearch
      })
      setCompanies(result.data)
      setPagination(prev => ({
        ...prev,
        total: result.total,
        totalPages: result.totalPages
      }))
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching companies:', err)
    } finally {
      setLoading(false)
    }
  }

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page }))
    }
  }, [pagination.totalPages])

  const nextPage = useCallback(() => {
    goToPage(pagination.page + 1)
  }, [pagination.page, goToPage])

  const prevPage = useCallback(() => {
    goToPage(pagination.page - 1)
  }, [pagination.page, goToPage])

  const setPageSize = useCallback((size: number) => {
    setPagination(prev => ({ ...prev, pageSize: size, page: 1 }))
  }, [])

  const deleteCompany = async (id: string) => {
    try {
      await companiesService.delete(id)
      await fetchCompanies()
    } catch (err) {
      console.error('Error deleting company:', err)
      throw err
    }
  }

  return {
    companies,
    searchTerm,
    setSearchTerm,
    loading,
    error,
    refresh: fetchCompanies,
    deleteCompany,
    // Pagination
    pagination,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
  }
}
