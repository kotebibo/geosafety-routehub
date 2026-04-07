'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'

export interface ServiceType {
  id: string
  name: string
  name_ka: string
  description?: string | null
  required_inspector_type?: string | null
  default_frequency_days?: number | null
  is_active: boolean | null
}

const SERVICE_TYPES_KEY = ['service-types'] as const

async function fetchServiceTypes(): Promise<ServiceType[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('service_types')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

export function useServiceTypes() {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: SERVICE_TYPES_KEY,
    queryFn: fetchServiceTypes,
    staleTime: 5 * 60 * 1000, // 5 min — this data barely changes
    gcTime: 30 * 60 * 1000, // 30 min cache
  })

  return {
    serviceTypes: data ?? [],
    loading: isLoading,
    error: error as Error | null,
    refresh: () => queryClient.invalidateQueries({ queryKey: SERVICE_TYPES_KEY }),
  }
}
