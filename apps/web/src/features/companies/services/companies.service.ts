import { supabase } from '@/lib/supabase/client'

// Use 'any' type assertion to avoid TypeScript inference issues with Supabase generated types
const db = supabase as any

export const companiesService = {
  getAll: async () => {
    const { data, error } = await db
      .from('companies')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data
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
}
