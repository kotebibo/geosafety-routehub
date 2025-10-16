'use client'

import { useState, useEffect } from 'react'
import { companiesService } from '@/services/companies.service'

export function useCompanies() {
  const [companies, setCompanies] = useState<any[]>([])
  const [filteredCompanies, setFilteredCompanies] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchCompanies()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      const filtered = companies.filter(company =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.address.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredCompanies(filtered)
    } else {
      setFilteredCompanies(companies)
    }
  }, [searchTerm, companies])

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      const data = await companiesService.getAll()
      setCompanies(data)
      setFilteredCompanies(data)
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching companies:', err)
    } finally {
      setLoading(false)
    }
  }

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
    companies: filteredCompanies,
    allCompanies: companies,
    searchTerm,
    setSearchTerm,
    loading,
    error,
    refresh: fetchCompanies,
    deleteCompany,
  }
}
