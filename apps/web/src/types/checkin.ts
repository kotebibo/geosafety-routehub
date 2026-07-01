export interface LocationCheckin {
  id: string
  inspector_id: string
  company_id?: string | null
  company_location_id?: string | null
  route_stop_id?: string | null
  board_item_id?: string | null
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
  checkout_distance?: number | null
  location_match?: boolean | null
  // Joined fields
  inspector_name?: string
  company_name?: string
  location_name?: string
  board_item_name?: string
  board_name?: string
}

export interface CheckinSummary {
  item_id: string
  checkin_count: number
  has_active: boolean
  latest_checkin_id: string | null
  latest_inspector_id: string | null
  latest_inspector_name: string | null
  latest_created_at: string | null
  latest_checked_out_at: string | null
  latest_duration_minutes: number | null
  latest_checkout_distance: number | null
  latest_location_match: boolean | null
}

export interface CreateCheckinInput {
  inspector_id: string
  company_id?: string | null
  company_location_id?: string | null
  route_stop_id?: string | null
  board_item_id?: string | null
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
