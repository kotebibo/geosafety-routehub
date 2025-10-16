export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          address: string
          location: unknown | null
          lat: number | null
          lng: number | null
          type: 'commercial' | 'residential' | 'industrial' | 'healthcare' | 'education' | null
          contact_name: string | null
          contact_phone: string | null
          contact_email: string | null
          notes: string | null
          inspection_frequency: number | null
          last_inspection_date: string | null
          next_inspection_date: string | null
          priority: 'low' | 'medium' | 'high' | null
          status: 'active' | 'inactive' | 'pending' | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          address: string
          location?: unknown | null
          lat?: number | null
          lng?: number | null
          type?: 'commercial' | 'residential' | 'industrial' | 'healthcare' | 'education' | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          notes?: string | null
          inspection_frequency?: number | null
          last_inspection_date?: string | null
          next_inspection_date?: string | null
          priority?: 'low' | 'medium' | 'high' | null
          status?: 'active' | 'inactive' | 'pending' | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          address?: string
          location?: unknown | null
          lat?: number | null
          lng?: number | null
          type?: 'commercial' | 'residential' | 'industrial' | 'healthcare' | 'education' | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          notes?: string | null
          inspection_frequency?: number | null
          last_inspection_date?: string | null
          next_inspection_date?: string | null
          priority?: 'low' | 'medium' | 'high' | null
          status?: 'active' | 'inactive' | 'pending' | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      inspectors: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          role: 'admin' | 'dispatcher' | 'inspector' | 'manager' | null
          certifications: Json | null
          vehicle_id: string | null
          working_hours: Json | null
          zone: string | null
          status: 'active' | 'inactive' | 'on_leave' | null
          current_location: unknown | null
          last_location_update: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          phone?: string | null
          role?: 'admin' | 'dispatcher' | 'inspector' | 'manager' | null
          certifications?: Json | null
          vehicle_id?: string | null
          working_hours?: Json | null
          zone?: string | null
          status?: 'active' | 'inactive' | 'on_leave' | null
          current_location?: unknown | null
          last_location_update?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string | null
          role?: 'admin' | 'dispatcher' | 'inspector' | 'manager' | null
          certifications?: Json | null
          vehicle_id?: string | null
          working_hours?: Json | null
          zone?: string | null
          status?: 'active' | 'inactive' | 'on_leave' | null
          current_location?: unknown | null
          last_location_update?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      routes: {
        Row: {
          id: string
          name: string | null
          date: string
          inspector_id: string | null
          status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | null
          start_time: string | null
          end_time: string | null
          total_distance_km: number | null
          total_duration_minutes: number | null
          optimization_type: 'distance' | 'time' | 'balanced' | null
          route_geometry: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name?: string | null
          date: string
          inspector_id?: string | null
          status?: 'planned' | 'in_progress' | 'completed' | 'cancelled' | null
          start_time?: string | null
          end_time?: string | null
          total_distance_km?: number | null
          total_duration_minutes?: number | null
          optimization_type?: 'distance' | 'time' | 'balanced' | null
          route_geometry?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          date?: string
          inspector_id?: string | null
          status?: 'planned' | 'in_progress' | 'completed' | 'cancelled' | null
          start_time?: string | null
          end_time?: string | null
          total_distance_km?: number | null
          total_duration_minutes?: number | null
          optimization_type?: 'distance' | 'time' | 'balanced' | null
          route_geometry?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      route_stops: {
        Row: {
          id: string
          route_id: string | null
          company_id: string | null
          position: number
          scheduled_arrival_time: string | null
          actual_arrival_time: string | null
          scheduled_departure_time: string | null
          actual_departure_time: string | null
          status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed' | null
          notes: string | null
          photos: Json | null
          signature_url: string | null
          distance_from_previous_km: number | null
          duration_from_previous_minutes: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          route_id?: string | null
          company_id?: string | null
          position: number
          scheduled_arrival_time?: string | null
          actual_arrival_time?: string | null
          scheduled_departure_time?: string | null
          actual_departure_time?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed' | null
          notes?: string | null
          photos?: Json | null
          signature_url?: string | null
          distance_from_previous_km?: number | null
          duration_from_previous_minutes?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          route_id?: string | null
          company_id?: string | null
          position?: number
          scheduled_arrival_time?: string | null
          actual_arrival_time?: string | null
          scheduled_departure_time?: string | null
          actual_departure_time?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed' | null
          notes?: string | null
          photos?: Json | null
          signature_url?: string | null
          distance_from_previous_km?: number | null
          duration_from_previous_minutes?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}