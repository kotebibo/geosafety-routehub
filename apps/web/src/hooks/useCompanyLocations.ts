import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { companiesService } from '@/services/companies.service'
import type { CompanyLocation, CompanyLocationInput } from '@/types/company'

// Query keys
export const locationKeys = {
  all: ['locations'] as const,
  byCompany: (companyId: string) => [...locationKeys.all, 'company', companyId] as const,
  byId: (locationId: string) => [...locationKeys.all, 'detail', locationId] as const,
}

// Hook to get all locations for a company
export function useCompanyLocations(companyId: string | undefined) {
  return useQuery({
    queryKey: locationKeys.byCompany(companyId || ''),
    queryFn: () => companiesService.locations.getByCompanyId(companyId!),
    enabled: !!companyId,
  })
}

// Hook to get a single location
export function useLocation(locationId: string | undefined) {
  return useQuery({
    queryKey: locationKeys.byId(locationId || ''),
    queryFn: () => companiesService.locations.getById(locationId!),
    enabled: !!locationId,
  })
}

// Hook to get primary location for a company
export function usePrimaryLocation(companyId: string | undefined) {
  return useQuery({
    queryKey: [...locationKeys.byCompany(companyId || ''), 'primary'] as const,
    queryFn: () => companiesService.locations.getPrimary(companyId!),
    enabled: !!companyId,
  })
}

// Hook for location mutations
export function useLocationMutations(companyId: string) {
  const queryClient = useQueryClient()

  const invalidateLocations = () => {
    queryClient.invalidateQueries({ queryKey: locationKeys.byCompany(companyId) })
    // Also invalidate company queries since location count may change
    queryClient.invalidateQueries({ queryKey: ['companies'] })
  }

  const createLocation = useMutation({
    mutationFn: (data: CompanyLocationInput) => 
      companiesService.locations.create(companyId, data),
    onSuccess: invalidateLocations,
  })

  const updateLocation = useMutation({
    mutationFn: ({ locationId, data }: { locationId: string; data: Partial<CompanyLocationInput> }) =>
      companiesService.locations.update(locationId, data),
    onSuccess: invalidateLocations,
  })

  const deleteLocation = useMutation({
    mutationFn: (locationId: string) => 
      companiesService.locations.delete(locationId),
    onSuccess: invalidateLocations,
  })

  const setPrimaryLocation = useMutation({
    mutationFn: (locationId: string) => 
      companiesService.locations.setPrimary(locationId),
    onSuccess: invalidateLocations,
  })

  const createManyLocations = useMutation({
    mutationFn: (locations: CompanyLocationInput[]) =>
      companiesService.locations.createMany(companyId, locations),
    onSuccess: invalidateLocations,
  })

  return {
    createLocation,
    updateLocation,
    deleteLocation,
    setPrimaryLocation,
    createManyLocations,
  }
}

// Hook to get company with all locations
export function useCompanyWithLocations(companyId: string | undefined) {
  return useQuery({
    queryKey: ['companies', companyId, 'with-locations'],
    queryFn: () => companiesService.getByIdWithLocations(companyId!),
    enabled: !!companyId,
  })
}

// Hook to get all companies with location counts (for pickers)
export function useCompaniesWithLocationCount() {
  return useQuery({
    queryKey: ['companies', 'with-location-count'],
    queryFn: () => companiesService.getAllWithLocationCount(),
  })
}
