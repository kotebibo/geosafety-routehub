// Company and Location Types for GeoSafety RouteHub

export interface CompanyLocation {
  id: string
  company_id: string
  name: string
  address: string
  lat?: number | null
  lng?: number | null
  is_primary: boolean
  contact_name?: string | null
  contact_phone?: string | null
  contact_email?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface CompanyLocationInput {
  name: string
  address: string
  lat?: number | null
  lng?: number | null
  is_primary?: boolean
  contact_name?: string | null
  contact_phone?: string | null
  contact_email?: string | null
  notes?: string | null
}

export interface CompanyWithLocations {
  id: string
  name: string
  type?: string | null
  priority?: string | null
  status?: string | null
  contact_name?: string | null
  contact_phone?: string | null
  contact_email?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  locations: CompanyLocation[]
  location_count: number
  primary_location?: CompanyLocation | null
}

// For board cell values - stores both company and location selection
export interface CompanyCellValue {
  company_id: string
  location_id?: string | null  // null = use primary location
}

// Helper type for companies list with location info
export interface CompanyListItem {
  id: string
  name: string
  location_count: number
  primary_location_id?: string | null
  primary_location_name?: string | null
  primary_location_address?: string | null
}

// Form state for creating/editing locations
export interface LocationFormData {
  id?: string  // undefined for new locations
  name: string
  address: string
  lat?: number | null
  lng?: number | null
  is_primary: boolean
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  notes?: string
}

// API response types
export interface CreateLocationResponse {
  success: boolean
  location?: CompanyLocation
  error?: string
}

export interface UpdateLocationResponse {
  success: boolean
  location?: CompanyLocation
  error?: string
}

export interface DeleteLocationResponse {
  success: boolean
  error?: string
}
