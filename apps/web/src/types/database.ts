export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5'
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'announcement_reads_announcement_id_fkey'
            columns: ['announcement_id']
            isOneToOne: false
            referencedRelation: 'announcements'
            referencedColumns: ['id']
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          is_published: boolean | null
          priority: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          priority?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          priority?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      board_columns: {
        Row: {
          board_id: string | null
          board_type: string
          column_id: string
          column_name: string
          column_name_ka: string | null
          column_type: string
          config: Json | null
          created_at: string | null
          id: string
          is_pinned: boolean | null
          is_visible: boolean | null
          position: number
          updated_at: string | null
          width: number | null
        }
        Insert: {
          board_id?: string | null
          board_type: string
          column_id: string
          column_name: string
          column_name_ka?: string | null
          column_type: string
          config?: Json | null
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          is_visible?: boolean | null
          position: number
          updated_at?: string | null
          width?: number | null
        }
        Update: {
          board_id?: string | null
          board_type?: string
          column_id?: string
          column_name?: string
          column_name_ka?: string | null
          column_type?: string
          config?: Json | null
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          is_visible?: boolean | null
          position?: number
          updated_at?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'board_columns_board_id_fkey'
            columns: ['board_id']
            isOneToOne: false
            referencedRelation: 'boards'
            referencedColumns: ['id']
          },
        ]
      }
      board_groups: {
        Row: {
          board_id: string
          color: string | null
          created_at: string | null
          id: string
          is_collapsed: boolean | null
          name: string
          position: number
          updated_at: string | null
        }
        Insert: {
          board_id: string
          color?: string | null
          created_at?: string | null
          id?: string
          is_collapsed?: boolean | null
          name: string
          position?: number
          updated_at?: string | null
        }
        Update: {
          board_id?: string
          color?: string | null
          created_at?: string | null
          id?: string
          is_collapsed?: boolean | null
          name?: string
          position?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'board_groups_board_id_fkey'
            columns: ['board_id']
            isOneToOne: false
            referencedRelation: 'boards'
            referencedColumns: ['id']
          },
        ]
      }
      board_items: {
        Row: {
          assigned_to: string | null
          board_id: string
          created_at: string | null
          created_by: string | null
          data: Json
          deleted_at: string | null
          due_date: string | null
          group_id: string | null
          id: string
          move_metadata: Json | null
          name: string
          original_board_id: string | null
          position: number
          priority: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          board_id: string
          created_at?: string | null
          created_by?: string | null
          data?: Json
          deleted_at?: string | null
          due_date?: string | null
          group_id?: string | null
          id?: string
          move_metadata?: Json | null
          name: string
          original_board_id?: string | null
          position?: number
          priority?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          board_id?: string
          created_at?: string | null
          created_by?: string | null
          data?: Json
          deleted_at?: string | null
          due_date?: string | null
          group_id?: string | null
          id?: string
          move_metadata?: Json | null
          name?: string
          original_board_id?: string | null
          position?: number
          priority?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'board_items_board_id_fkey'
            columns: ['board_id']
            isOneToOne: false
            referencedRelation: 'boards'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'board_items_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'board_groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'board_items_original_board_id_fkey'
            columns: ['original_board_id']
            isOneToOne: false
            referencedRelation: 'boards'
            referencedColumns: ['id']
          },
        ]
      }
      board_members: {
        Row: {
          added_at: string | null
          added_by: string | null
          board_id: string
          role: string
          user_id: string
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          board_id: string
          role: string
          user_id: string
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          board_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'board_members_board_id_fkey'
            columns: ['board_id']
            isOneToOne: false
            referencedRelation: 'boards'
            referencedColumns: ['id']
          },
        ]
      }
      board_presence: {
        Row: {
          board_id: string
          board_type: string
          editing_item_id: string | null
          is_editing: boolean | null
          last_seen: string | null
          user_id: string
        }
        Insert: {
          board_id?: string
          board_type: string
          editing_item_id?: string | null
          is_editing?: boolean | null
          last_seen?: string | null
          user_id: string
        }
        Update: {
          board_id?: string
          board_type?: string
          editing_item_id?: string | null
          is_editing?: boolean | null
          last_seen?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'board_presence_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'inspectors'
            referencedColumns: ['id']
          },
        ]
      }
      board_subitem_columns: {
        Row: {
          board_id: string
          column_id: string
          column_name: string
          column_name_ka: string | null
          column_type: string
          config: Json | null
          created_at: string | null
          id: string
          is_visible: boolean
          position: number
          updated_at: string | null
          width: number
        }
        Insert: {
          board_id: string
          column_id: string
          column_name: string
          column_name_ka?: string | null
          column_type?: string
          config?: Json | null
          created_at?: string | null
          id?: string
          is_visible?: boolean
          position?: number
          updated_at?: string | null
          width?: number
        }
        Update: {
          board_id?: string
          column_id?: string
          column_name?: string
          column_name_ka?: string | null
          column_type?: string
          config?: Json | null
          created_at?: string | null
          id?: string
          is_visible?: boolean
          position?: number
          updated_at?: string | null
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: 'board_subitem_columns_board_id_fkey'
            columns: ['board_id']
            isOneToOne: false
            referencedRelation: 'boards'
            referencedColumns: ['id']
          },
        ]
      }
      board_subitems: {
        Row: {
          assigned_to: string | null
          board_id: string
          created_at: string | null
          created_by: string | null
          data: Json | null
          due_date: string | null
          id: string
          name: string
          parent_item_id: string
          position: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          board_id: string
          created_at?: string | null
          created_by?: string | null
          data?: Json | null
          due_date?: string | null
          id?: string
          name?: string
          parent_item_id: string
          position?: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          board_id?: string
          created_at?: string | null
          created_by?: string | null
          data?: Json | null
          due_date?: string | null
          id?: string
          name?: string
          parent_item_id?: string
          position?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'board_subitems_assigned_to_fkey'
            columns: ['assigned_to']
            isOneToOne: false
            referencedRelation: 'inspectors'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'board_subitems_board_id_fkey'
            columns: ['board_id']
            isOneToOne: false
            referencedRelation: 'boards'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'board_subitems_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'inspectors'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'board_subitems_parent_item_id_fkey'
            columns: ['parent_item_id']
            isOneToOne: false
            referencedRelation: 'board_items'
            referencedColumns: ['id']
          },
        ]
      }
      board_templates: {
        Row: {
          board_type: string
          category: string | null
          color: string | null
          created_at: string | null
          default_columns: Json
          default_items: Json | null
          description: string | null
          icon: string | null
          id: string
          is_featured: boolean | null
          name: string
          name_ka: string | null
          updated_at: string | null
        }
        Insert: {
          board_type: string
          category?: string | null
          color?: string | null
          created_at?: string | null
          default_columns?: Json
          default_items?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          is_featured?: boolean | null
          name: string
          name_ka?: string | null
          updated_at?: string | null
        }
        Update: {
          board_type?: string
          category?: string | null
          color?: string | null
          created_at?: string | null
          default_columns?: Json
          default_items?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          is_featured?: boolean | null
          name?: string
          name_ka?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      board_view_tabs: {
        Row: {
          board_id: string
          created_at: string | null
          created_by: string | null
          filters: Json | null
          group_by_column: string | null
          icon: string | null
          id: string
          is_default: boolean
          position: number
          sort_config: Json | null
          updated_at: string | null
          view_name: string
          view_name_ka: string | null
          view_type: string
        }
        Insert: {
          board_id: string
          created_at?: string | null
          created_by?: string | null
          filters?: Json | null
          group_by_column?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean
          position?: number
          sort_config?: Json | null
          updated_at?: string | null
          view_name: string
          view_name_ka?: string | null
          view_type?: string
        }
        Update: {
          board_id?: string
          created_at?: string | null
          created_by?: string | null
          filters?: Json | null
          group_by_column?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean
          position?: number
          sort_config?: Json | null
          updated_at?: string | null
          view_name?: string
          view_name_ka?: string | null
          view_type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'board_view_tabs_board_id_fkey'
            columns: ['board_id']
            isOneToOne: false
            referencedRelation: 'boards'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'board_view_tabs_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'inspectors'
            referencedColumns: ['id']
          },
        ]
      }
      board_views: {
        Row: {
          board_type: string
          column_config: Json | null
          created_at: string | null
          filters: Json | null
          id: string
          is_default: boolean | null
          is_shared: boolean | null
          sort_config: Json | null
          updated_at: string | null
          user_id: string
          view_name: string
          view_name_ka: string | null
        }
        Insert: {
          board_type: string
          column_config?: Json | null
          created_at?: string | null
          filters?: Json | null
          id?: string
          is_default?: boolean | null
          is_shared?: boolean | null
          sort_config?: Json | null
          updated_at?: string | null
          user_id: string
          view_name: string
          view_name_ka?: string | null
        }
        Update: {
          board_type?: string
          column_config?: Json | null
          created_at?: string | null
          filters?: Json | null
          id?: string
          is_default?: boolean | null
          is_shared?: boolean | null
          sort_config?: Json | null
          updated_at?: string | null
          user_id?: string
          view_name?: string
          view_name_ka?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'board_views_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'inspectors'
            referencedColumns: ['id']
          },
        ]
      }
      boards: {
        Row: {
          board_type: string
          color: string | null
          created_at: string | null
          description: string | null
          folder_id: string | null
          icon: string | null
          id: string
          is_public: boolean | null
          is_template: boolean | null
          name: string
          name_ka: string | null
          owner_id: string
          position: number | null
          settings: Json | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          board_type: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          folder_id?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean | null
          is_template?: boolean | null
          name: string
          name_ka?: string | null
          owner_id: string
          position?: number | null
          settings?: Json | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          board_type?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          folder_id?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean | null
          is_template?: boolean | null
          name?: string
          name_ka?: string | null
          owner_id?: string
          position?: number | null
          settings?: Json | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'boards_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      companies: {
        Row: {
          address: string
          assigned_inspector_id: string | null
          assignment_date: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string | null
          id: string
          initial_payment: number | null
          inspection_frequency: number | null
          invoice_amount: number | null
          invoice_frequency: string | null
          last_inspection_date: string | null
          lat: number | null
          lng: number | null
          location: unknown
          monday_board_id: string | null
          monday_item_id: string | null
          monthly_payment: number | null
          name: string
          next_inspection_date: string | null
          notes: string | null
          payment_method: string | null
          priority: string | null
          receiving_bank: string | null
          sales_manager: string | null
          status: string | null
          tax_id: string | null
          type: string | null
          updated_at: string | null
          vat_status: string | null
        }
        Insert: {
          address: string
          assigned_inspector_id?: string | null
          assignment_date?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string | null
          id?: string
          initial_payment?: number | null
          inspection_frequency?: number | null
          invoice_amount?: number | null
          invoice_frequency?: string | null
          last_inspection_date?: string | null
          lat?: number | null
          lng?: number | null
          location?: unknown
          monday_board_id?: string | null
          monday_item_id?: string | null
          monthly_payment?: number | null
          name: string
          next_inspection_date?: string | null
          notes?: string | null
          payment_method?: string | null
          priority?: string | null
          receiving_bank?: string | null
          sales_manager?: string | null
          status?: string | null
          tax_id?: string | null
          type?: string | null
          updated_at?: string | null
          vat_status?: string | null
        }
        Update: {
          address?: string
          assigned_inspector_id?: string | null
          assignment_date?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string | null
          id?: string
          initial_payment?: number | null
          inspection_frequency?: number | null
          invoice_amount?: number | null
          invoice_frequency?: string | null
          last_inspection_date?: string | null
          lat?: number | null
          lng?: number | null
          location?: unknown
          monday_board_id?: string | null
          monday_item_id?: string | null
          monthly_payment?: number | null
          name?: string
          next_inspection_date?: string | null
          notes?: string | null
          payment_method?: string | null
          priority?: string | null
          receiving_bank?: string | null
          sales_manager?: string | null
          status?: string | null
          tax_id?: string | null
          type?: string | null
          updated_at?: string | null
          vat_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'companies_assigned_inspector_id_fkey'
            columns: ['assigned_inspector_id']
            isOneToOne: false
            referencedRelation: 'inspectors'
            referencedColumns: ['id']
          },
        ]
      }
      company_locations: {
        Row: {
          address: string
          company_id: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_primary: boolean | null
          lat: number | null
          lng: number | null
          name: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          address: string
          company_id: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          lat?: number | null
          lng?: number | null
          name: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          company_id?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          lat?: number | null
          lng?: number | null
          name?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'company_locations_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'company_locations_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies_with_location_count'
            referencedColumns: ['id']
          },
        ]
      }
      company_pdp_phases: {
        Row: {
          company_id: string
          completed_date: string | null
          created_at: string | null
          current_phase: number | null
          id: string
          inspector_id: string | null
          notes: string | null
          phase: number
          scheduled_date: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          completed_date?: string | null
          created_at?: string | null
          current_phase?: number | null
          id?: string
          inspector_id?: string | null
          notes?: string | null
          phase: number
          scheduled_date?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          completed_date?: string | null
          created_at?: string | null
          current_phase?: number | null
          id?: string
          inspector_id?: string | null
          notes?: string | null
          phase?: number
          scheduled_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'company_pdp_phases_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'company_pdp_phases_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies_with_location_count'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'company_pdp_phases_inspector_id_fkey'
            columns: ['inspector_id']
            isOneToOne: false
            referencedRelation: 'inspectors'
            referencedColumns: ['id']
          },
        ]
      }
      company_services: {
        Row: {
          assigned_inspector_id: string | null
          company_id: string
          created_at: string | null
          id: string
          inspection_frequency_days: number | null
          last_inspection_date: string | null
          next_inspection_date: string | null
          notes: string | null
          priority: string | null
          service_type_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_inspector_id?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          inspection_frequency_days?: number | null
          last_inspection_date?: string | null
          next_inspection_date?: string | null
          notes?: string | null
          priority?: string | null
          service_type_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_inspector_id?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          inspection_frequency_days?: number | null
          last_inspection_date?: string | null
          next_inspection_date?: string | null
          notes?: string | null
          priority?: string | null
          service_type_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'company_services_assigned_inspector_id_fkey'
            columns: ['assigned_inspector_id']
            isOneToOne: false
            referencedRelation: 'inspectors'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'company_services_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'company_services_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies_with_location_count'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'company_services_service_type_id_fkey'
            columns: ['service_type_id']
            isOneToOne: false
            referencedRelation: 'service_types'
            referencedColumns: ['id']
          },
        ]
      }
      custom_roles: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string
          id: string
          is_system: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_system?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_system?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          board_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_active: boolean | null
          name: string
          tag_mapping: Json
          tags: Json
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          board_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          tag_mapping?: Json
          tags?: Json
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          board_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          tag_mapping?: Json
          tags?: Json
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'document_templates_board_id_fkey'
            columns: ['board_id']
            isOneToOne: false
            referencedRelation: 'boards'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'document_templates_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      generated_documents: {
        Row: {
          board_id: string
          created_at: string | null
          emailed_at: string | null
          emailed_to: string[] | null
          file_name: string
          file_path: string
          file_size: number | null
          generated_by: string
          id: string
          item_id: string
          metadata: Json | null
          template_id: string | null
        }
        Insert: {
          board_id: string
          created_at?: string | null
          emailed_at?: string | null
          emailed_to?: string[] | null
          file_name: string
          file_path: string
          file_size?: number | null
          generated_by: string
          id?: string
          item_id: string
          metadata?: Json | null
          template_id?: string | null
        }
        Update: {
          board_id?: string
          created_at?: string | null
          emailed_at?: string | null
          emailed_to?: string[] | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          generated_by?: string
          id?: string
          item_id?: string
          metadata?: Json | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'generated_documents_board_id_fkey'
            columns: ['board_id']
            isOneToOne: false
            referencedRelation: 'boards'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'generated_documents_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'board_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'generated_documents_template_id_fkey'
            columns: ['template_id']
            isOneToOne: false
            referencedRelation: 'document_templates'
            referencedColumns: ['id']
          },
        ]
      }
      inspection_history: {
        Row: {
          check_in_time: string | null
          check_out_time: string | null
          company_id: string
          created_at: string | null
          duration_minutes: number | null
          failure_reason: string | null
          gps_coordinates: unknown
          id: string
          inspection_date: string
          inspector_id: string
          notes: string | null
          photos: string[] | null
          route_id: string | null
          service_type_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          check_in_time?: string | null
          check_out_time?: string | null
          company_id: string
          created_at?: string | null
          duration_minutes?: number | null
          failure_reason?: string | null
          gps_coordinates?: unknown
          id?: string
          inspection_date: string
          inspector_id: string
          notes?: string | null
          photos?: string[] | null
          route_id?: string | null
          service_type_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          check_in_time?: string | null
          check_out_time?: string | null
          company_id?: string
          created_at?: string | null
          duration_minutes?: number | null
          failure_reason?: string | null
          gps_coordinates?: unknown
          id?: string
          inspection_date?: string
          inspector_id?: string
          notes?: string | null
          photos?: string[] | null
          route_id?: string | null
          service_type_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'inspection_history_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inspection_history_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies_with_location_count'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inspection_history_inspector_id_fkey'
            columns: ['inspector_id']
            isOneToOne: false
            referencedRelation: 'inspectors'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inspection_history_route_id_fkey'
            columns: ['route_id']
            isOneToOne: false
            referencedRelation: 'routes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inspection_history_service_type_id_fkey'
            columns: ['service_type_id']
            isOneToOne: false
            referencedRelation: 'service_types'
            referencedColumns: ['id']
          },
        ]
      }
      inspections: {
        Row: {
          company_id: string | null
          created_at: string | null
          findings: string | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string
          inspection_date: string
          inspection_type: string | null
          inspector_id: string | null
          recommendations: string | null
          report_url: string | null
          route_stop_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          findings?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          inspection_date: string
          inspection_type?: string | null
          inspector_id?: string | null
          recommendations?: string | null
          report_url?: string | null
          route_stop_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          findings?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          inspection_date?: string
          inspection_type?: string | null
          inspector_id?: string | null
          recommendations?: string | null
          report_url?: string | null
          route_stop_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'inspections_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inspections_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies_with_location_count'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inspections_inspector_id_fkey'
            columns: ['inspector_id']
            isOneToOne: false
            referencedRelation: 'inspectors'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inspections_route_stop_id_fkey'
            columns: ['route_stop_id']
            isOneToOne: false
            referencedRelation: 'route_stops'
            referencedColumns: ['id']
          },
        ]
      }
      inspectors: {
        Row: {
          certification_expiry_dates: Json | null
          certifications: Json | null
          created_at: string | null
          current_location: unknown
          email: string
          full_name: string
          id: string
          last_location_update: string | null
          phone: string | null
          role: string | null
          specialty: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          vehicle_id: string | null
          working_hours: Json | null
          zone: string | null
        }
        Insert: {
          certification_expiry_dates?: Json | null
          certifications?: Json | null
          created_at?: string | null
          current_location?: unknown
          email: string
          full_name: string
          id?: string
          last_location_update?: string | null
          phone?: string | null
          role?: string | null
          specialty?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_id?: string | null
          working_hours?: Json | null
          zone?: string | null
        }
        Update: {
          certification_expiry_dates?: Json | null
          certifications?: Json | null
          created_at?: string | null
          current_location?: unknown
          email?: string
          full_name?: string
          id?: string
          last_location_update?: string | null
          phone?: string | null
          role?: string | null
          specialty?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_id?: string | null
          working_hours?: Json | null
          zone?: string | null
        }
        Relationships: []
      }
      item_comments: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string | null
          id: string
          is_edited: boolean | null
          item_id: string
          item_type: string
          mentions: Json | null
          parent_comment_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          item_id: string
          item_type: string
          mentions?: Json | null
          parent_comment_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          item_id?: string
          item_type?: string
          mentions?: Json | null
          parent_comment_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'item_comments_parent_comment_id_fkey'
            columns: ['parent_comment_id']
            isOneToOne: false
            referencedRelation: 'item_comments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'item_comments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'inspectors'
            referencedColumns: ['id']
          },
        ]
      }
      item_updates: {
        Row: {
          column_id: string | null
          content: string | null
          created_at: string | null
          field_name: string | null
          id: string
          item_id: string
          item_type: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          source_board_id: string | null
          target_board_id: string | null
          update_type: string
          user_id: string | null
        }
        Insert: {
          column_id?: string | null
          content?: string | null
          created_at?: string | null
          field_name?: string | null
          id?: string
          item_id: string
          item_type: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          source_board_id?: string | null
          target_board_id?: string | null
          update_type: string
          user_id?: string | null
        }
        Update: {
          column_id?: string | null
          content?: string | null
          created_at?: string | null
          field_name?: string | null
          id?: string
          item_id?: string
          item_type?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          source_board_id?: string | null
          target_board_id?: string | null
          update_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'item_updates_source_board_id_fkey'
            columns: ['source_board_id']
            isOneToOne: false
            referencedRelation: 'boards'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'item_updates_target_board_id_fkey'
            columns: ['target_board_id']
            isOneToOne: false
            referencedRelation: 'boards'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'item_updates_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'inspectors'
            referencedColumns: ['id']
          },
        ]
      }
      location_checkins: {
        Row: {
          accuracy: number | null
          company_id: string
          company_location_id: string | null
          created_at: string | null
          distance_from_location: number | null
          id: string
          inspector_id: string
          lat: number
          lng: number
          location_updated: boolean | null
          notes: string | null
          photos: Json | null
          route_stop_id: string | null
        }
        Insert: {
          accuracy?: number | null
          company_id: string
          company_location_id?: string | null
          created_at?: string | null
          distance_from_location?: number | null
          id?: string
          inspector_id: string
          lat: number
          lng: number
          location_updated?: boolean | null
          notes?: string | null
          photos?: Json | null
          route_stop_id?: string | null
        }
        Update: {
          accuracy?: number | null
          company_id?: string
          company_location_id?: string | null
          created_at?: string | null
          distance_from_location?: number | null
          id?: string
          inspector_id?: string
          lat?: number
          lng?: number
          location_updated?: boolean | null
          notes?: string | null
          photos?: Json | null
          route_stop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'location_checkins_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'location_checkins_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies_with_location_count'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'location_checkins_company_location_id_fkey'
            columns: ['company_location_id']
            isOneToOne: false
            referencedRelation: 'companies_with_location_count'
            referencedColumns: ['primary_location_id']
          },
          {
            foreignKeyName: 'location_checkins_company_location_id_fkey'
            columns: ['company_location_id']
            isOneToOne: false
            referencedRelation: 'company_locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'location_checkins_inspector_id_fkey'
            columns: ['inspector_id']
            isOneToOne: false
            referencedRelation: 'inspectors'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'location_checkins_route_stop_id_fkey'
            columns: ['route_stop_id']
            isOneToOne: false
            referencedRelation: 'route_stops'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pdp_compliance_phases: {
        Row: {
          certificate_number: string | null
          certification_date: string | null
          checkup_interval_days: number | null
          company_id: string
          compliance_status: Database['public']['Enums']['compliance_status']
          created_at: string
          created_by: string | null
          id: string
          next_checkup_date: string | null
          phase_1_completed: boolean | null
          phase_1_date: string | null
          phase_1_notes: string | null
          phase_2_completed: boolean | null
          phase_2_date: string | null
          phase_2_notes: string | null
          phase_3_completed: boolean | null
          phase_3_date: string | null
          phase_3_notes: string | null
          phase_4_completed: boolean | null
          phase_4_date: string | null
          phase_4_notes: string | null
          phase_5_completed: boolean | null
          phase_5_date: string | null
          phase_5_notes: string | null
          updated_at: string
        }
        Insert: {
          certificate_number?: string | null
          certification_date?: string | null
          checkup_interval_days?: number | null
          company_id: string
          compliance_status?: Database['public']['Enums']['compliance_status']
          created_at?: string
          created_by?: string | null
          id?: string
          next_checkup_date?: string | null
          phase_1_completed?: boolean | null
          phase_1_date?: string | null
          phase_1_notes?: string | null
          phase_2_completed?: boolean | null
          phase_2_date?: string | null
          phase_2_notes?: string | null
          phase_3_completed?: boolean | null
          phase_3_date?: string | null
          phase_3_notes?: string | null
          phase_4_completed?: boolean | null
          phase_4_date?: string | null
          phase_4_notes?: string | null
          phase_5_completed?: boolean | null
          phase_5_date?: string | null
          phase_5_notes?: string | null
          updated_at?: string
        }
        Update: {
          certificate_number?: string | null
          certification_date?: string | null
          checkup_interval_days?: number | null
          company_id?: string
          compliance_status?: Database['public']['Enums']['compliance_status']
          created_at?: string
          created_by?: string | null
          id?: string
          next_checkup_date?: string | null
          phase_1_completed?: boolean | null
          phase_1_date?: string | null
          phase_1_notes?: string | null
          phase_2_completed?: boolean | null
          phase_2_date?: string | null
          phase_2_notes?: string | null
          phase_3_completed?: boolean | null
          phase_3_date?: string | null
          phase_3_notes?: string | null
          phase_4_completed?: boolean | null
          phase_4_date?: string | null
          phase_4_notes?: string | null
          phase_5_completed?: boolean | null
          phase_5_date?: string | null
          phase_5_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pdp_compliance_phases_company_id_fkey'
            columns: ['company_id']
            isOneToOne: true
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pdp_compliance_phases_company_id_fkey'
            columns: ['company_id']
            isOneToOne: true
            referencedRelation: 'companies_with_location_count'
            referencedColumns: ['id']
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          resource: string
        }
        Insert: {
          action: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          resource: string
        }
        Update: {
          action?: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          resource?: string
        }
        Relationships: []
      }
      reassignment_history: {
        Row: {
          company_id: string
          created_at: string | null
          from_inspector_id: string | null
          id: string
          is_temporary: boolean | null
          reason: string | null
          reassigned_by_user_id: string | null
          reassignment_date: string | null
          revert_date: string | null
          service_type_id: string
          to_inspector_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          from_inspector_id?: string | null
          id?: string
          is_temporary?: boolean | null
          reason?: string | null
          reassigned_by_user_id?: string | null
          reassignment_date?: string | null
          revert_date?: string | null
          service_type_id: string
          to_inspector_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          from_inspector_id?: string | null
          id?: string
          is_temporary?: boolean | null
          reason?: string | null
          reassigned_by_user_id?: string | null
          reassignment_date?: string | null
          revert_date?: string | null
          service_type_id?: string
          to_inspector_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reassignment_history_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reassignment_history_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies_with_location_count'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reassignment_history_from_inspector_id_fkey'
            columns: ['from_inspector_id']
            isOneToOne: false
            referencedRelation: 'inspectors'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reassignment_history_reassigned_by_user_id_fkey'
            columns: ['reassigned_by_user_id']
            isOneToOne: false
            referencedRelation: 'inspectors'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reassignment_history_service_type_id_fkey'
            columns: ['service_type_id']
            isOneToOne: false
            referencedRelation: 'service_types'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reassignment_history_to_inspector_id_fkey'
            columns: ['to_inspector_id']
            isOneToOne: false
            referencedRelation: 'inspectors'
            referencedColumns: ['id']
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission: string
          role_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission: string
          role_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permission?: string
          role_name?: string
        }
        Relationships: []
      }
      route_stops: {
        Row: {
          actual_arrival_time: string | null
          actual_departure_time: string | null
          company_id: string | null
          created_at: string | null
          distance_from_previous_km: number | null
          duration_from_previous_minutes: number | null
          id: string
          notes: string | null
          photos: Json | null
          position: number
          route_id: string | null
          scheduled_arrival_time: string | null
          scheduled_departure_time: string | null
          signature_url: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          actual_arrival_time?: string | null
          actual_departure_time?: string | null
          company_id?: string | null
          created_at?: string | null
          distance_from_previous_km?: number | null
          duration_from_previous_minutes?: number | null
          id?: string
          notes?: string | null
          photos?: Json | null
          position: number
          route_id?: string | null
          scheduled_arrival_time?: string | null
          scheduled_departure_time?: string | null
          signature_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_arrival_time?: string | null
          actual_departure_time?: string | null
          company_id?: string | null
          created_at?: string | null
          distance_from_previous_km?: number | null
          duration_from_previous_minutes?: number | null
          id?: string
          notes?: string | null
          photos?: Json | null
          position?: number
          route_id?: string | null
          scheduled_arrival_time?: string | null
          scheduled_departure_time?: string | null
          signature_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'route_stops_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'route_stops_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies_with_location_count'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'route_stops_route_id_fkey'
            columns: ['route_id']
            isOneToOne: false
            referencedRelation: 'routes'
            referencedColumns: ['id']
          },
        ]
      }
      routes: {
        Row: {
          created_at: string | null
          date: string
          end_time: string | null
          id: string
          inspector_id: string | null
          name: string | null
          optimization_type: string | null
          route_geometry: Json | null
          service_type_id: string | null
          start_time: string | null
          status: string | null
          total_distance_km: number | null
          total_duration_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          end_time?: string | null
          id?: string
          inspector_id?: string | null
          name?: string | null
          optimization_type?: string | null
          route_geometry?: Json | null
          service_type_id?: string | null
          start_time?: string | null
          status?: string | null
          total_distance_km?: number | null
          total_duration_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          end_time?: string | null
          id?: string
          inspector_id?: string | null
          name?: string | null
          optimization_type?: string | null
          route_geometry?: Json | null
          service_type_id?: string | null
          start_time?: string | null
          status?: string | null
          total_distance_km?: number | null
          total_duration_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'routes_inspector_id_fkey'
            columns: ['inspector_id']
            isOneToOne: false
            referencedRelation: 'inspectors'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'routes_service_type_id_fkey'
            columns: ['service_type_id']
            isOneToOne: false
            referencedRelation: 'service_types'
            referencedColumns: ['id']
          },
        ]
      }
      service_types: {
        Row: {
          created_at: string | null
          default_frequency_days: number | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ka: string
          required_inspector_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_frequency_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ka: string
          required_inspector_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_frequency_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ka?: string
          required_inspector_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          inspector_id: string | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          inspector_id?: string | null
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          inspector_id?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_roles_inspector_id_fkey'
            columns: ['inspector_id']
            isOneToOne: false
            referencedRelation: 'inspectors'
            referencedColumns: ['id']
          },
        ]
      }
      user_settings: {
        Row: {
          board_preferences: Json | null
          created_at: string | null
          language: string | null
          notification_settings: Json | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          board_preferences?: Json | null
          created_at?: string | null
          language?: string | null
          notification_settings?: Json | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          board_preferences?: Json | null
          created_at?: string | null
          language?: string | null
          notification_settings?: Json | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_settings_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'inspectors'
            referencedColumns: ['id']
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          last_login_at?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          added_at: string | null
          added_by: string | null
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          role: string
          user_id: string
          workspace_id: string
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_members_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspaces: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          name_ka: string | null
          owner_id: string
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          name_ka?: string | null
          owner_id: string
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          name_ka?: string | null
          owner_id?: string
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      companies_with_location_count: {
        Row: {
          address: string | null
          assigned_inspector_id: string | null
          assignment_date: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string | null
          inspection_frequency: number | null
          last_inspection_date: string | null
          lat: number | null
          lng: number | null
          location: unknown
          location_count: number | null
          name: string | null
          next_inspection_date: string | null
          notes: string | null
          primary_location_address: string | null
          primary_location_id: string | null
          primary_location_name: string | null
          priority: string | null
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'companies_assigned_inspector_id_fkey'
            columns: ['assigned_inspector_id']
            isOneToOne: false
            referencedRelation: 'inspectors'
            referencedColumns: ['id']
          },
        ]
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      pdp_compliance_overview: {
        Row: {
          certificate_number: string | null
          certification_date: string | null
          checkup_interval_days: number | null
          company_address: string | null
          company_id: string | null
          company_name: string | null
          compliance_status: Database['public']['Enums']['compliance_status'] | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          current_phase_status: string | null
          id: string | null
          next_checkup_date: string | null
          phase_1_completed: boolean | null
          phase_1_date: string | null
          phase_1_notes: string | null
          phase_2_completed: boolean | null
          phase_2_date: string | null
          phase_2_notes: string | null
          phase_3_completed: boolean | null
          phase_3_date: string | null
          phase_3_notes: string | null
          phase_4_completed: boolean | null
          phase_4_date: string | null
          phase_4_notes: string | null
          phase_5_completed: boolean | null
          phase_5_date: string | null
          phase_5_notes: string | null
          phases_completed: number | null
          progress_percentage: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'pdp_compliance_phases_company_id_fkey'
            columns: ['company_id']
            isOneToOne: true
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pdp_compliance_phases_company_id_fkey'
            columns: ['company_id']
            isOneToOne: true
            referencedRelation: 'companies_with_location_count'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ''?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { '': string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      calculate_inspection_duration: {
        Args: { end_time: string; start_time: string }
        Returns: string
      }
      can_access_board:
        | { Args: { board_uuid: string }; Returns: boolean }
        | {
            Args: { check_board_id: string; check_user_id: string }
            Returns: boolean
          }
      can_edit_board:
        | { Args: { board_uuid: string }; Returns: boolean }
        | {
            Args: { check_board_id: string; check_user_id: string }
            Returns: boolean
          }
      cleanup_stale_presence: { Args: never; Returns: undefined }
      create_item_update: {
        Args: { p_content: string; p_item_id: string; p_user_id: string }
        Returns: string
      }
      create_notification: {
        Args: {
          p_data?: Json
          p_message: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      duplicate_board:
        | {
            Args: { p_board_id: string; p_new_name: string; p_owner_id: string }
            Returns: string
          }
        | {
            Args: {
              new_name: string
              new_owner_id: string
              source_board_id: string
            }
            Returns: string
          }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { '': string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { '': string }; Returns: unknown }
      get_announcements_with_read_status: {
        Args: never
        Returns: {
          author_id: string
          author_name: string
          content: string
          created_at: string
          id: string
          is_published: boolean
          is_read: boolean
          priority: string
          read_at: string
          title: string
          updated_at: string
        }[]
      }
      get_auth_user_id_by_email: {
        Args: { user_email: string }
        Returns: string
      }
      get_board_workspace_id: { Args: { board_uuid: string }; Returns: string }
      get_company_primary_location: {
        Args: { company_uuid: string }
        Returns: {
          location_address: string
          location_id: string
          location_lat: number
          location_lng: number
          location_name: string
        }[]
      }
      get_current_inspector_id: { Args: never; Returns: string }
      get_current_user_id: { Args: never; Returns: string }
      get_my_email: { Args: never; Returns: string }
      get_my_inspector_id: { Args: never; Returns: string }
      get_my_workspace_ids: { Args: never; Returns: string[] }
      get_unread_announcements_count: { Args: never; Returns: number }
      get_unread_notification_count: { Args: never; Returns: number }
      get_user_activity_summary:
        | {
            Args: { p_days?: number; p_user_id: string }
            Returns: {
              count: number
              update_type: string
            }[]
          }
        | {
            Args: { user_uuid: string }
            Returns: {
              total_boards: number
              total_items: number
              total_updates: number
            }[]
          }
      get_user_inspector_id:
        | { Args: never; Returns: string }
        | { Args: { check_user_id: string }; Returns: string }
      get_user_role: { Args: never; Returns: string } | { Args: { uid: string }; Returns: string }
      gettransactionid: { Args: never; Returns: unknown }
      has_permission: {
        Args: { required_permission: string }
        Returns: boolean
      }
      is_admin_or_dispatcher:
        | { Args: never; Returns: boolean }
        | { Args: { check_user_id: string }; Returns: boolean }
      is_admin_user:
        | { Args: never; Returns: boolean }
        | { Args: { check_user_id: string }; Returns: boolean }
      is_workspace_admin: { Args: { workspace_uuid: string }; Returns: boolean }
      is_workspace_board_manager: {
        Args: { workspace_uuid: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { workspace_uuid: string }
        Returns: boolean
      }
      is_workspace_owner: { Args: { workspace_uuid: string }; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      mark_all_notifications_read: { Args: never; Returns: number }
      mark_announcement_read: {
        Args: { p_announcement_id: string }
        Returns: boolean
      }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      promote_to_admin: { Args: { target_email: string }; Returns: Json }
      search_board_items_global: {
        Args: {
          max_per_board?: number
          max_total?: number
          search_query: string
        }
        Returns: {
          board_color: string
          board_icon: string
          board_name: string
          board_type: string
          item_assigned_to: string
          item_board_id: string
          item_created_at: string
          item_data: Json
          item_due_date: string
          item_group_id: string
          item_id: string
          item_name: string
          item_position: number
          item_status: string
          matched_field: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { '': string }; Returns: string[] }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { '': string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { '': string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { '': string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { '': string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { '': string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { '': string }; Returns: string }
      st_astext: { Args: { '': string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { '': string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { '': string }; Returns: unknown }
      st_geographyfromtext: { Args: { '': string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { '': string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { '': string }; Returns: unknown }
      st_geomfromewkt: { Args: { '': string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { '': Json }; Returns: unknown }
        | { Args: { '': Json }; Returns: unknown }
        | { Args: { '': string }; Returns: unknown }
      st_geomfromgml: { Args: { '': string }; Returns: unknown }
      st_geomfromkml: { Args: { '': string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { '': string }; Returns: unknown }
      st_gmltosql: { Args: { '': string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database['public']['CompositeTypes']['valid_detail']
        SetofOptions: {
          from: '*'
          to: 'valid_detail'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { '': string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { '': string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { '': string }; Returns: unknown }
      st_mpointfromtext: { Args: { '': string }; Returns: unknown }
      st_mpolyfromtext: { Args: { '': string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { '': string }; Returns: unknown }
      st_multipointfromtext: { Args: { '': string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { '': string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { '': string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { '': string }; Returns: unknown }
      st_polygonfromtext: { Args: { '': string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { '': string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { '': string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      upsert_user_profile: {
        Args: {
          p_user_avatar_url?: string
          p_user_email: string
          p_user_full_name?: string
          p_user_id: string
        }
        Returns: Json
      }
      user_is_board_member: {
        Args: { board_uuid: string; user_uuid: string }
        Returns: boolean
      }
      user_is_board_owner: {
        Args: { board_uuid: string; user_uuid: string }
        Returns: boolean
      }
      user_is_workspace_member: {
        Args: { user_uuid: string; workspace_uuid: string }
        Returns: boolean
      }
      user_is_workspace_owner: {
        Args: { user_uuid: string; workspace_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      compliance_status: 'new' | 'in_progress' | 'certified' | 'active'
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      compliance_status: ['new', 'in_progress', 'certified', 'active'],
    },
  },
} as const
