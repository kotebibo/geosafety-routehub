import { supabase } from '@/lib/supabase/client'
import type {
  CompanyLocation,
  CompanyLocationInput,
  CompanyWithLocations,
  CompanyListItem
} from '@/types/company'

// Use 'any' type assertion to avoid TypeScript inference issues with Supabase generated types
const db = supabase as any

export const companiesService = {
  // ============================================
  // COMPANY METHODS (existing)
  // ============================================
  
  getAll: async () => {
    const { data, error } = await db
      .from('companies')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data
  },

  // Get all companies with location count (for lists/pickers)
  getAllWithLocationCount: async (): Promise<CompanyListItem[]> => {
    const { data, error } = await db
      .from('companies_with_location_count')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data as CompanyListItem[]
  },

  getById: async (id: string) => {
    const { data, error } = await db
      .from('companies')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  // Get company with all its locations
  getByIdWithLocations: async (id: string): Promise<CompanyWithLocations> => {
    const { data: company, error: companyError } = await db
      .from('companies')
      .select('*')
      .eq('id', id)
      .single()
    
    if (companyError) throw companyError

    const { data: locations, error: locationsError } = await db
      .from('company_locations')
      .select('*')
      .eq('company_id', id)
      .order('is_primary', { ascending: false })
      .order('name')
    
    if (locationsError) throw locationsError

    const primaryLocation = locations?.find((loc: any) => loc.is_primary) || null

    return {
      ...company,
      locations: locations || [],
      location_count: locations?.length || 0,
      primary_location: primaryLocation
    } as CompanyWithLocations
  },

  getWithServices: async (companyId: string) => {
    const { data, error } = await db
      .from('company_services')
      .select(`
        *,
        service_type:service_types(id, name, name_ka),
        assigned_inspector:inspectors(id, full_name)
      `)
      .eq('company_id', companyId)
    
    if (error) throw error
    return data
  },

  create: async (companyData: {
    name: string
    address?: string
    lat?: number
    lng?: number
    contact_name?: string
    contact_phone?: string
    contact_email?: string
    type?: string
    priority?: string
    status?: string
  }) => {
    const { data, error } = await db
      .from('companies')
      .insert(companyData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Create company with initial locations
  createWithLocations: async (
    companyData: { name: string; type?: string; priority?: string; status?: string },
    locations: CompanyLocationInput[]
  ) => {
    // Find the primary location's address to set on company (for backward compatibility)
    const primaryLocation = locations.find(loc => loc.is_primary) || locations[0]
    const companyAddress = primaryLocation?.address || ''

    // First create the company with address from primary location
    const { data: company, error: companyError } = await db
      .from('companies')
      .insert({
        ...companyData,
        address: companyAddress,
        lat: primaryLocation?.lat,
        lng: primaryLocation?.lng
      })
      .select()
      .single()
    
    if (companyError) throw companyError

    // Then create all locations
    if (locations.length > 0) {
      const locationsWithCompanyId = locations.map(loc => ({
        ...loc,
        company_id: company.id
      }))

      const { error: locationsError } = await db
        .from('company_locations')
        .insert(locationsWithCompanyId)
      
      if (locationsError) throw locationsError
    }

    return company
  },

  update: async (id: string, updates: any) => {
    const { data, error } = await db
      .from('companies')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  delete: async (id: string) => {
    const { error } = await db
      .from('companies')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  search: async (searchTerm: string) => {
    const { data, error } = await db
      .from('companies')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`)
      .order('name')
      .limit(50)
    
    if (error) throw error
    return data
  },

  // Search companies with location info
  searchWithLocations: async (searchTerm: string): Promise<CompanyListItem[]> => {
    const { data, error } = await db
      .from('companies_with_location_count')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,primary_location_address.ilike.%${searchTerm}%`)
      .order('name')
      .limit(50)
    
    if (error) throw error
    return data as CompanyListItem[]
  },

  // ============================================
  // LOCATION METHODS (new)
  // ============================================

  locations: {
    // Get all locations for a company
    getByCompanyId: async (companyId: string): Promise<CompanyLocation[]> => {
      const { data, error } = await db
        .from('company_locations')
        .select('*')
        .eq('company_id', companyId)
        .order('is_primary', { ascending: false })
        .order('name')
      
      if (error) throw error
      return data as CompanyLocation[]
    },

    // Get a single location by ID
    getById: async (locationId: string): Promise<CompanyLocation> => {
      const { data, error } = await db
        .from('company_locations')
        .select('*')
        .eq('id', locationId)
        .single()
      
      if (error) throw error
      return data as CompanyLocation
    },

    // Get primary location for a company
    getPrimary: async (companyId: string): Promise<CompanyLocation | null> => {
      const { data, error } = await db
        .from('company_locations')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_primary', true)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error  // PGRST116 = no rows
      return data as CompanyLocation | null
    },

    // Create a new location
    create: async (companyId: string, locationData: CompanyLocationInput): Promise<CompanyLocation> => {
      const { data, error } = await db
        .from('company_locations')
        .insert({
          ...locationData,
          company_id: companyId
        })
        .select()
        .single()
      
      if (error) throw error
      return data as CompanyLocation
    },

    // Update a location
    update: async (locationId: string, updates: Partial<CompanyLocationInput>): Promise<CompanyLocation> => {
      const { data, error } = await db
        .from('company_locations')
        .update(updates)
        .eq('id', locationId)
        .select()
        .single()
      
      if (error) throw error
      return data as CompanyLocation
    },

    // Delete a location
    delete: async (locationId: string): Promise<void> => {
      const { error } = await db
        .from('company_locations')
        .delete()
        .eq('id', locationId)
      
      if (error) throw error
    },

    // Set a location as primary (will unset others via trigger)
    setPrimary: async (locationId: string): Promise<CompanyLocation> => {
      const { data, error } = await db
        .from('company_locations')
        .update({ is_primary: true })
        .eq('id', locationId)
        .select()
        .single()
      
      if (error) throw error
      return data as CompanyLocation
    },

    // Bulk create locations for a company
    createMany: async (companyId: string, locations: CompanyLocationInput[]): Promise<CompanyLocation[]> => {
      const locationsWithCompanyId = locations.map(loc => ({
        ...loc,
        company_id: companyId
      }))

      const { data, error } = await db
        .from('company_locations')
        .insert(locationsWithCompanyId)
        .select()
      
      if (error) throw error
      return data as CompanyLocation[]
    },

    // Get location count for a company
    getCount: async (companyId: string): Promise<number> => {
      const { count, error } = await db
        .from('company_locations')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
      
      if (error) throw error
      return count || 0
    }
  }
}
