'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export interface ServiceType {
  id: string
  name: string
  name_ka: string
  description?: string
  required_inspector_type?: string
  default_frequency_days?: number
  is_active: boolean
}

export function useServiceTypes() {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchServiceTypes()
  }, [])

  const fetchServiceTypes = async () => {
    try {
      setLoading(true)
      const supabase = createClient() as any

      const { data, error } = await supabase
        .from('service_types')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error

      setServiceTypes(data || [])
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching service types:', err)
    } finally {
      setLoading(false)
    }
  }

  return {
    serviceTypes,
    loading,
    error,
    refresh: fetchServiceTypes,
  }
}
