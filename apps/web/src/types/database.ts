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
          assigned_inspector_id: string | null
          assignment_date: string | null
          primary_location_address: string | null
          // Contract fields (from Monday.com migration)
          tax_id: string | null
          contract_start_date: string | null
          contract_end_date: string | null
          initial_payment: number | null
          monthly_payment: number | null
          payment_method: string | null
          invoice_frequency: string | null
          vat_status: string | null
          invoice_amount: number | null
          receiving_bank: string | null
          sales_manager: string | null
          monday_board_id: string | null
          monday_item_id: string | null
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
          assigned_inspector_id?: string | null
          assignment_date?: string | null
          primary_location_address?: string | null
          // Contract fields (from Monday.com migration)
          tax_id?: string | null
          contract_start_date?: string | null
          contract_end_date?: string | null
          initial_payment?: number | null
          monthly_payment?: number | null
          payment_method?: string | null
          invoice_frequency?: string | null
          vat_status?: string | null
          invoice_amount?: number | null
          receiving_bank?: string | null
          sales_manager?: string | null
          monday_board_id?: string | null
          monday_item_id?: string | null
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
          assigned_inspector_id?: string | null
          assignment_date?: string | null
          primary_location_address?: string | null
          // Contract fields (from Monday.com migration)
          tax_id?: string | null
          contract_start_date?: string | null
          contract_end_date?: string | null
          initial_payment?: number | null
          monthly_payment?: number | null
          payment_method?: string | null
          invoice_frequency?: string | null
          vat_status?: string | null
          invoice_amount?: number | null
          receiving_bank?: string | null
          sales_manager?: string | null
          monday_board_id?: string | null
          monday_item_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      company_locations: {
        Row: {
          id: string
          company_id: string
          name: string | null
          address: string
          lat: number
          lng: number
          is_primary: boolean
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          name?: string | null
          address: string
          lat: number
          lng: number
          is_primary?: boolean
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          name?: string | null
          address?: string
          lat?: number
          lng?: number
          is_primary?: boolean
          notes?: string | null
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
          specialty: string | null
          certifications: string[] | null
          certification_expiry_dates: Json | null
          vehicle_id: string | null
          working_hours: Json | null
          zone: string | null
          status: 'active' | 'inactive' | 'on_leave' | null
          current_location: unknown | null
          last_location_update: string | null
          user_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          phone?: string | null
          role?: 'admin' | 'dispatcher' | 'inspector' | 'manager' | null
          specialty?: string | null
          certifications?: string[] | null
          certification_expiry_dates?: Json | null
          vehicle_id?: string | null
          working_hours?: Json | null
          zone?: string | null
          status?: 'active' | 'inactive' | 'on_leave' | null
          current_location?: unknown | null
          last_location_update?: string | null
          user_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string | null
          role?: 'admin' | 'dispatcher' | 'inspector' | 'manager' | null
          specialty?: string | null
          certifications?: string[] | null
          certification_expiry_dates?: Json | null
          vehicle_id?: string | null
          working_hours?: Json | null
          zone?: string | null
          status?: 'active' | 'inactive' | 'on_leave' | null
          current_location?: unknown | null
          last_location_update?: string | null
          user_id?: string | null
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
          service_type_id: string | null
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
          service_type_id?: string | null
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
          service_type_id?: string | null
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
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: string
          inspector_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          inspector_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          inspector_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      role_permissions: {
        Row: {
          id: string
          role_name: string
          permission: string
          created_at: string | null
        }
        Insert: {
          id?: string
          role_name: string
          permission: string
          created_at?: string | null
        }
        Update: {
          id?: string
          role_name?: string
          permission?: string
          created_at?: string | null
        }
      }
      service_types: {
        Row: {
          id: string
          name: string
          name_ka: string
          description: string | null
          description_ka: string | null
          required_inspector_type: string | null
          default_frequency_days: number | null
          regulatory_requirement: boolean | null
          is_active: boolean | null
          sort_order: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          name_ka: string
          description?: string | null
          description_ka?: string | null
          required_inspector_type?: string | null
          default_frequency_days?: number | null
          regulatory_requirement?: boolean | null
          is_active?: boolean | null
          sort_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          name_ka?: string
          description?: string | null
          description_ka?: string | null
          required_inspector_type?: string | null
          default_frequency_days?: number | null
          regulatory_requirement?: boolean | null
          is_active?: boolean | null
          sort_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      company_services: {
        Row: {
          id: string
          company_id: string
          service_type_id: string
          inspection_frequency_days: number | null
          last_inspection_date: string | null
          next_inspection_date: string | null
          assigned_inspector_id: string | null
          priority: 'low' | 'medium' | 'high' | null
          status: 'active' | 'inactive' | 'suspended' | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          service_type_id: string
          inspection_frequency_days?: number | null
          last_inspection_date?: string | null
          next_inspection_date?: string | null
          assigned_inspector_id?: string | null
          priority?: 'low' | 'medium' | 'high' | null
          status?: 'active' | 'inactive' | 'suspended' | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          service_type_id?: string
          inspection_frequency_days?: number | null
          last_inspection_date?: string | null
          next_inspection_date?: string | null
          assigned_inspector_id?: string | null
          priority?: 'low' | 'medium' | 'high' | null
          status?: 'active' | 'inactive' | 'suspended' | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      inspection_history: {
        Row: {
          id: string
          company_id: string
          service_type_id: string
          inspector_id: string
          route_id: string | null
          inspection_date: string
          check_in_time: string | null
          check_out_time: string | null
          duration_minutes: number | null
          status: 'completed' | 'failed' | 'skipped' | 'in_progress' | 'partial' | null
          failure_reason: string | null
          notes: string | null
          photos: string[] | null
          gps_coordinates: unknown | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          service_type_id: string
          inspector_id: string
          route_id?: string | null
          inspection_date: string
          check_in_time?: string | null
          check_out_time?: string | null
          duration_minutes?: number | null
          status?: 'completed' | 'failed' | 'skipped' | 'in_progress' | 'partial' | null
          failure_reason?: string | null
          notes?: string | null
          photos?: string[] | null
          gps_coordinates?: unknown | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          service_type_id?: string
          inspector_id?: string
          route_id?: string | null
          inspection_date?: string
          check_in_time?: string | null
          check_out_time?: string | null
          duration_minutes?: number | null
          status?: 'completed' | 'failed' | 'skipped' | 'in_progress' | 'partial' | null
          failure_reason?: string | null
          notes?: string | null
          photos?: string[] | null
          gps_coordinates?: unknown | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      reassignment_history: {
        Row: {
          id: string
          company_id: string
          service_type_id: string
          from_inspector_id: string | null
          to_inspector_id: string
          reassigned_by_user_id: string | null
          reassignment_date: string | null
          reason: string | null
          is_temporary: boolean | null
          revert_date: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          service_type_id: string
          from_inspector_id?: string | null
          to_inspector_id: string
          reassigned_by_user_id?: string | null
          reassignment_date?: string | null
          reason?: string | null
          is_temporary?: boolean | null
          revert_date?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          service_type_id?: string
          from_inspector_id?: string | null
          to_inspector_id?: string
          reassigned_by_user_id?: string | null
          reassignment_date?: string | null
          reason?: string | null
          is_temporary?: boolean | null
          revert_date?: string | null
          created_at?: string | null
        }
      }
      boards: {
        Row: {
          id: string
          owner_id: string
          board_type: 'routes' | 'companies' | 'inspectors' | 'inspections' | 'custom'
          name: string
          name_ka: string | null
          description: string | null
          icon: string | null
          color: string | null
          is_template: boolean | null
          is_public: boolean | null
          folder_id: string | null
          settings: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          board_type: 'routes' | 'companies' | 'inspectors' | 'inspections' | 'custom'
          name: string
          name_ka?: string | null
          description?: string | null
          icon?: string | null
          color?: string | null
          is_template?: boolean | null
          is_public?: boolean | null
          folder_id?: string | null
          settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          board_type?: 'routes' | 'companies' | 'inspectors' | 'inspections' | 'custom'
          name?: string
          name_ka?: string | null
          description?: string | null
          icon?: string | null
          color?: string | null
          is_template?: boolean | null
          is_public?: boolean | null
          folder_id?: string | null
          settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      board_items: {
        Row: {
          id: string
          board_id: string
          group_id: string | null
          position: number
          data: Json
          name: string
          status: string | null
          assigned_to: string | null
          due_date: string | null
          priority: number | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          board_id: string
          group_id?: string | null
          position?: number
          data?: Json
          name: string
          status?: string | null
          assigned_to?: string | null
          due_date?: string | null
          priority?: number | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          board_id?: string
          group_id?: string | null
          position?: number
          data?: Json
          name?: string
          status?: string | null
          assigned_to?: string | null
          due_date?: string | null
          priority?: number | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      board_groups: {
        Row: {
          id: string
          board_id: string
          name: string
          color: string | null
          position: number
          is_collapsed: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          board_id: string
          name: string
          color?: string | null
          position?: number
          is_collapsed?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          board_id?: string
          name?: string
          color?: string | null
          position?: number
          is_collapsed?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      board_columns: {
        Row: {
          id: string
          board_id: string | null
          board_type: string | null
          column_id: string
          column_name: string
          column_name_ka: string | null
          column_type: string
          is_visible: boolean | null
          is_pinned: boolean | null
          position: number
          width: number | null
          config: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          board_id?: string | null
          board_type?: string | null
          column_id: string
          column_name: string
          column_name_ka?: string | null
          column_type: string
          is_visible?: boolean | null
          is_pinned?: boolean | null
          position: number
          width?: number | null
          config?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          board_id?: string | null
          board_type?: string | null
          column_id?: string
          column_name?: string
          column_name_ka?: string | null
          column_type?: string
          is_visible?: boolean | null
          is_pinned?: boolean | null
          position?: number
          width?: number | null
          config?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      board_members: {
        Row: {
          board_id: string
          user_id: string
          role: 'owner' | 'editor' | 'viewer'
          added_by: string | null
          added_at: string | null
        }
        Insert: {
          board_id: string
          user_id: string
          role: 'owner' | 'editor' | 'viewer'
          added_by?: string | null
          added_at?: string | null
        }
        Update: {
          board_id?: string
          user_id?: string
          role?: 'owner' | 'editor' | 'viewer'
          added_by?: string | null
          added_at?: string | null
        }
      }
      board_templates: {
        Row: {
          id: string
          name: string
          name_ka: string | null
          description: string | null
          board_type: string
          icon: string | null
          color: string | null
          category: string | null
          default_columns: Json
          default_items: Json | null
          is_featured: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          name_ka?: string | null
          description?: string | null
          board_type: string
          icon?: string | null
          color?: string | null
          category?: string | null
          default_columns?: Json
          default_items?: Json | null
          is_featured?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          name_ka?: string | null
          description?: string | null
          board_type?: string
          icon?: string | null
          color?: string | null
          category?: string | null
          default_columns?: Json
          default_items?: Json | null
          is_featured?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      board_views: {
        Row: {
          id: string
          user_id: string
          board_type: string
          view_name: string
          view_name_ka: string | null
          filters: Json | null
          sort_config: Json | null
          column_config: Json | null
          is_default: boolean | null
          is_shared: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          board_type: string
          view_name: string
          view_name_ka?: string | null
          filters?: Json | null
          sort_config?: Json | null
          column_config?: Json | null
          is_default?: boolean | null
          is_shared?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          board_type?: string
          view_name?: string
          view_name_ka?: string | null
          filters?: Json | null
          sort_config?: Json | null
          column_config?: Json | null
          is_default?: boolean | null
          is_shared?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      item_updates: {
        Row: {
          id: string
          item_type: string
          item_id: string
          user_id: string | null
          update_type: string
          field_name: string | null
          old_value: string | null
          new_value: string | null
          content: string | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          item_type: string
          item_id: string
          user_id?: string | null
          update_type: string
          field_name?: string | null
          old_value?: string | null
          new_value?: string | null
          content?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          item_type?: string
          item_id?: string
          user_id?: string | null
          update_type?: string
          field_name?: string | null
          old_value?: string | null
          new_value?: string | null
          content?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
      }
      item_comments: {
        Row: {
          id: string
          item_type: string
          item_id: string
          user_id: string
          parent_comment_id: string | null
          content: string
          mentions: Json | null
          attachments: Json | null
          is_edited: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          item_type: string
          item_id: string
          user_id: string
          parent_comment_id?: string | null
          content: string
          mentions?: Json | null
          attachments?: Json | null
          is_edited?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          item_type?: string
          item_id?: string
          user_id?: string
          parent_comment_id?: string | null
          content?: string
          mentions?: Json | null
          attachments?: Json | null
          is_edited?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      board_presence: {
        Row: {
          user_id: string
          board_type: string
          board_id: string
          last_seen: string | null
          is_editing: boolean | null
          editing_item_id: string | null
        }
        Insert: {
          user_id: string
          board_type: string
          board_id?: string
          last_seen?: string | null
          is_editing?: boolean | null
          editing_item_id?: string | null
        }
        Update: {
          user_id?: string
          board_type?: string
          board_id?: string
          last_seen?: string | null
          is_editing?: boolean | null
          editing_item_id?: string | null
        }
      }
      user_settings: {
        Row: {
          user_id: string
          theme: 'light' | 'dark' | 'auto' | null
          language: 'ka' | 'en' | null
          notification_settings: Json | null
          board_preferences: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          user_id: string
          theme?: 'light' | 'dark' | 'auto' | null
          language?: 'ka' | 'en' | null
          notification_settings?: Json | null
          board_preferences?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          user_id?: string
          theme?: 'light' | 'dark' | 'auto' | null
          language?: 'ka' | 'en' | null
          notification_settings?: Json | null
          board_preferences?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      pdp_phases: {
        Row: {
          id: string
          company_id: string
          phase: number
          completed_date: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          phase: number
          completed_date?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          phase?: number
          completed_date?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      pdp_compliance_phases: {
        Row: {
          id: string
          company_id: string
          compliance_status: string | null
          phase_1_date: string | null
          phase_1_completed: boolean | null
          phase_1_notes: string | null
          phase_2_date: string | null
          phase_2_completed: boolean | null
          phase_2_notes: string | null
          phase_3_date: string | null
          phase_3_completed: boolean | null
          phase_3_notes: string | null
          phase_4_date: string | null
          phase_4_completed: boolean | null
          phase_4_notes: string | null
          phase_5_date: string | null
          phase_5_completed: boolean | null
          phase_5_notes: string | null
          certification_date: string | null
          next_checkup_date: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          compliance_status?: string | null
          phase_1_date?: string | null
          phase_1_completed?: boolean | null
          phase_1_notes?: string | null
          phase_2_date?: string | null
          phase_2_completed?: boolean | null
          phase_2_notes?: string | null
          phase_3_date?: string | null
          phase_3_completed?: boolean | null
          phase_3_notes?: string | null
          phase_4_date?: string | null
          phase_4_completed?: boolean | null
          phase_4_notes?: string | null
          phase_5_date?: string | null
          phase_5_completed?: boolean | null
          phase_5_notes?: string | null
          certification_date?: string | null
          next_checkup_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          compliance_status?: string | null
          phase_1_date?: string | null
          phase_1_completed?: boolean | null
          phase_1_notes?: string | null
          phase_2_date?: string | null
          phase_2_completed?: boolean | null
          phase_2_notes?: string | null
          phase_3_date?: string | null
          phase_3_completed?: boolean | null
          phase_3_notes?: string | null
          phase_4_date?: string | null
          phase_4_completed?: boolean | null
          phase_4_notes?: string | null
          phase_5_date?: string | null
          phase_5_completed?: boolean | null
          phase_5_notes?: string | null
          certification_date?: string | null
          next_checkup_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      workspaces: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string
          color: string | null
          icon: string | null
          is_default: boolean | null
          settings: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          owner_id: string
          color?: string | null
          icon?: string | null
          is_default?: boolean | null
          settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          owner_id?: string
          color?: string | null
          icon?: string | null
          is_default?: boolean | null
          settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      workspace_members: {
        Row: {
          workspace_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member' | 'guest'
          added_at: string | null
        }
        Insert: {
          workspace_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member' | 'guest'
          added_at?: string | null
        }
        Update: {
          workspace_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member' | 'guest'
          added_at?: string | null
        }
      }
      custom_roles: {
        Row: {
          id: string
          name: string
          display_name: string
          description: string | null
          color: string | null
          is_system: boolean | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          description?: string | null
          color?: string | null
          is_system?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          description?: string | null
          color?: string | null
          is_system?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      permissions: {
        Row: {
          id: string
          name: string
          resource: string
          action: string
          description: string | null
          category: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          resource: string
          action: string
          description?: string | null
          category?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          resource?: string
          action?: string
          description?: string | null
          category?: string | null
          created_at?: string | null
        }
      }
      company_pdp_phases: {
        Row: {
          id: string
          company_id: string
          phase: number
          completed_date: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          phase: number
          completed_date?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          phase?: number
          completed_date?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      board_activity: {
        Row: {
          id: string
          board_id: string
          user_id: string | null
          action: string
          item_id: string | null
          details: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          board_id: string
          user_id?: string | null
          action: string
          item_id?: string | null
          details?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          board_id?: string
          user_id?: string | null
          action?: string
          item_id?: string | null
          details?: Json | null
          created_at?: string | null
        }
      }
    }
    Views: {
      pdp_compliance_overview: {
        Row: {
          id: string
          company_id: string
          company_name: string | null
          compliance_status: string | null
          phases_completed: number | null
          next_checkup_date: string | null
          certification_date: string | null
          created_at: string | null
        }
      }
      companies_with_location_count: {
        Row: {
          id: string
          name: string
          location_count: number
          primary_location_id: string | null
          primary_location_name: string | null
          primary_location_address: string | null
        }
      }
    }
    Functions: {
      get_user_role: {
        Args: { uid: string }
        Returns: string
      }
      is_admin_user: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      is_admin_or_dispatcher: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      get_user_inspector_id: {
        Args: { check_user_id: string }
        Returns: string
      }
      can_access_board: {
        Args: { check_user_id: string; check_board_id: string }
        Returns: boolean
      }
      can_edit_board: {
        Args: { check_user_id: string; check_board_id: string }
        Returns: boolean
      }
      upsert_user_profile: {
        Args: {
          p_user_id: string
          p_user_email: string
          p_user_full_name: string | null
          p_user_avatar_url: string | null
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
