'use client'

import { useState, useEffect } from 'react'
import { assignmentsService } from '@/services/assignments.service'
import { supabase } from '@/lib/supabase/client'

export function useCompanyAssignments(serviceTypeId: string = 'all') {
  const [assignments, setAssignments] = useState<any[]>([])
  const [serviceTypes, setServiceTypes] = useState<any[]>([])
  const [inspectorWorkload, setInspectorWorkload] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, assigned: 0, unassigned: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch assignments
      const assignmentsData = await assignmentsService.getByServiceType(serviceTypeId)
      setAssignments(assignmentsData)
      
      // Fetch service types
      const { data: serviceTypesData, error: stError } = await supabase
        .from('service_types')
        .select('*')
        .eq('is_active', true)
        .order('name_ka')
      
      if (stError) throw stError
      setServiceTypes(serviceTypesData)
      
      // Fetch statistics
      const statsData = await assignmentsService.getStatistics()
      setStats(statsData)
      
      // Fetch inspector workload
      const workloadData = await assignmentsService.getInspectorWorkload()
      setInspectorWorkload(workloadData)
      
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching assignments:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [serviceTypeId])

  const handleBulkAssign = async (ids: string[], inspectorId: string | null) => {
    try {
      await assignmentsService.bulkAssign(ids, inspectorId)
      await fetchData() // Refresh all data
    } catch (err) {
      console.error('Error bulk assigning:', err)
      throw err
    }
  }

  return {
    assignments,
    serviceTypes,
    inspectorWorkload,
    stats,
    loading,
    error,
    handleBulkAssign,
    refresh: fetchData,
  }
}
