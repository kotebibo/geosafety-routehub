export interface LocationCheckin {
  id: string
  inspector_id: string
  company_id: string
  company_location_id?: string | null
  route_stop_id?: string | null
  lat: number
  lng: number
  accuracy?: number | null
  notes?: string | null
  photos?: string[] | null
  location_updated: boolean
  distance_from_location?: number | null
  created_at: string
  // Checkout fields
  checked_out_at?: string | null
  checkout_lat?: number | null
  checkout_lng?: number | null
  checkout_accuracy?: number | null
  duration_minutes?: number | null
  // Joined fields
  inspector_name?: string
  company_name?: string
  location_name?: string
}

export interface CreateCheckinInput {
  inspector_id: string
  company_id: string
  company_location_id?: string | null
  route_stop_id?: string | null
  lat: number
  lng: number
  accuracy?: number
  notes?: string
}

export interface CheckoutInput {
  checkin_id: string
  lat: number
  lng: number
  accuracy?: number
}
