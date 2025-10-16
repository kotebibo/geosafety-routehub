'use client'

import { useState, useEffect } from 'react'
import { inspectorsService } from '@/services/inspectors.service'

export function useInspectors() {
  const [inspectors, setInspectors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchInspectors()
  }, [])

  const fetchInspectors = async () => {
    try {
      setLoading(true)
      const data = await inspectorsService.getAll()
      setInspectors(data)
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching inspectors:', err)
    } finally {
      setLoading(false)
    }
  }

  const deleteInspector = async (id: string) => {
    try {
      await inspectorsService.delete(id)
      await fetchInspectors()
    } catch (err) {
      console.error('Error deleting inspector:', err)
      throw err
    }
  }

  const updateInspectorStatus = async (id: string, status: 'active' | 'inactive') => {
    try {
      await inspectorsService.update(id, { status })
      await fetchInspectors()
    } catch (err) {
      console.error('Error updating inspector:', err)
      throw err
    }
  }

  return {
    inspectors,
    loading,
    error,
    refresh: fetchInspectors,
    deleteInspector,
    updateInspectorStatus,
  }
}
