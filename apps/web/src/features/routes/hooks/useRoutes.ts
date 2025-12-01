'use client'

import { useState, useEffect } from 'react'
import { routesService } from '@/services/routes.service'
import { inspectorsService } from '@/services/inspectors.service'

export function useRoutes() {
  const [routes, setRoutes] = useState<any[]>([])
  const [inspectors, setInspectors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [routesData, inspectorsData] = await Promise.all([
        routesService.getAll(),
        inspectorsService.getActive(), // Only active inspectors for route management
      ])
      setRoutes(routesData)
      setInspectors(inspectorsData)
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const deleteRoute = async (id: string) => {
    try {
      await routesService.delete(id)
      await fetchData()
    } catch (err) {
      console.error('Error deleting route:', err)
      throw err
    }
  }

  const reassignRoute = async (routeId: string, inspectorId: string) => {
    try {
      await routesService.reassign(routeId, inspectorId)
      await fetchData()
    } catch (err) {
      console.error('Error reassigning route:', err)
      throw err
    }
  }

  return {
    routes,
    inspectors,
    loading,
    error,
    refresh: fetchData,
    deleteRoute,
    reassignRoute,
  }
}
