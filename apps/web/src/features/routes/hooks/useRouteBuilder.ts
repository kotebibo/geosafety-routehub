'use client'

import { useState, useEffect } from 'react'
import { inspectorsService } from '@/services/inspectors.service'
import { routesService } from '@/services/routes.service'
import { useToast } from '@/components/ui-monday/Toast'

interface Company {
  id: string
  name: string
  address: string
  lat: number
  lng: number
}

export function useRouteBuilder() {
  const { showToast } = useToast()
  const [inspectors, setInspectors] = useState<any[]>([])
  const [selectedInspector, setSelectedInspector] = useState<string>('')
  const [inspectorCompanies, setInspectorCompanies] = useState<Company[]>([])
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set())
  const [optimizedRoute, setOptimizedRoute] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [optimizing, setOptimizing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchInspectors()
  }, [])

  useEffect(() => {
    if (selectedInspector) {
      fetchInspectorCompanies()
    } else {
      setInspectorCompanies([])
      setSelectedCompanies(new Set())
      setOptimizedRoute(null)
    }
  }, [selectedInspector])

  const fetchInspectors = async () => {
    try {
      const data = await inspectorsService.getActive()
      setInspectors(data)
    } catch (error) {
      console.error('Error fetching inspectors:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInspectorCompanies = async () => {
    try {
      const assignments = await inspectorsService.getWithAssignments(selectedInspector)
      const companies = assignments.map((a: any) => ({
        id: a.company.id,
        name: a.company.name,
        address: a.company.address,
        lat: a.company.lat,
        lng: a.company.lng,
      }))
      setInspectorCompanies(companies)
    } catch (error) {
      console.error('Error fetching companies:', error)
    }
  }

  const toggleCompany = (companyId: string) => {
    const newSelected = new Set(selectedCompanies)
    if (newSelected.has(companyId)) {
      newSelected.delete(companyId)
    } else {
      newSelected.add(companyId)
    }
    setSelectedCompanies(newSelected)
    setOptimizedRoute(null) // Clear route when selection changes
  }

  const selectAll = () => {
    setSelectedCompanies(new Set(inspectorCompanies.map(c => c.id)))
    setOptimizedRoute(null)
  }

  const clearSelection = () => {
    setSelectedCompanies(new Set())
    setOptimizedRoute(null)
  }

  const optimizeRoute = async () => {
    if (selectedCompanies.size === 0) {
      showToast('აირჩიეთ მინიმუმ ერთი კომპანია', 'warning')
      return
    }

    try {
      setOptimizing(true)
      const selectedCompaniesList = inspectorCompanies.filter(c => selectedCompanies.has(c.id))

      // Call OSRM for route optimization
      const coordinates = selectedCompaniesList.map(c => `${c.lng},${c.lat}`).join(';')
      const osrmUrl = `https://router.project-osrm.org/trip/v1/driving/${coordinates}?source=first&roundtrip=false`

      const response = await fetch(osrmUrl)
      const data = await response.json()

      if (data.code === 'Ok' && data.trips && data.trips[0]) {
        const trip = data.trips[0]
        const orderedStops = trip.legs.map((leg: any, index: number) => ({
          company: selectedCompaniesList[data.waypoints[index].waypoint_index],
          position: index,
          distance: leg.distance / 1000, // Convert to km
        }))

        // Add final stop
        orderedStops.push({
          company: selectedCompaniesList[data.waypoints[data.waypoints.length - 1].waypoint_index],
          position: orderedStops.length,
          distance: 0,
        })

        setOptimizedRoute({
          stops: orderedStops,
          totalDistance: trip.distance / 1000,
          geometry: trip.geometry,
        })
      } else {
        throw new Error('Failed to optimize route')
      }
    } catch (error) {
      console.error('Error optimizing route:', error)
      showToast('მარშრუტის ოპტიმიზაციისას დაფიქსირდა შეცდომა', 'error')
    } finally {
      setOptimizing(false)
    }
  }

  const saveRoute = async (routeData: {
    name: string
    date: string // Changed from scheduled_date
    start_time: string
    notes?: string
  }) => {
    if (!optimizedRoute || !selectedInspector) {
      showToast('ჯერ შექმენით ოპტიმიზებული მარშრუტი', 'warning')
      return
    }

    try {
      setSaving(true)
      await routesService.create({
        ...routeData,
        inspector_id: selectedInspector,
        stops: optimizedRoute.stops,
        total_distance: optimizedRoute.totalDistance,
        route_geometry: optimizedRoute.geometry || null,
      })

      showToast('მარშრუტი წარმატებით შეინახა!', 'success')

      // Reset form
      setSelectedCompanies(new Set())
      setOptimizedRoute(null)
    } catch (error) {
      console.error('Error saving route:', error)
      showToast('მარშრუტის შენახვისას დაფიქსირდა შეცდომა', 'error')
    } finally {
      setSaving(false)
    }
  }

  return {
    inspectors,
    selectedInspector,
    setSelectedInspector,
    inspectorCompanies,
    selectedCompanies,
    toggleCompany,
    selectAll,
    clearSelection,
    optimizedRoute,
    optimizeRoute,
    optimizing,
    saveRoute,
    saving,
    loading,
  }
}
