import { createClient } from '@/lib/supabase'

// Helper to get supabase client with current auth state
// IMPORTANT: Must be called inside functions, not at module level
const getDb = () => createClient()

export const inspectorsService = {
  getAll: async (includeInactive = true) => {
    let query = getDb()
      .from('inspectors')
      .select('*')

    if (!includeInactive) {
      query = query.eq('status', 'active')
    }

    const { data, error } = await query.order('full_name')

    if (error) throw error
    return data
  },

  getActive: async () => {
    const { data, error } = await getDb()
      .from('inspectors')
      .select('*')
      .eq('status', 'active')
      .order('full_name')

    if (error) throw error
    return data
  },

  getById: async (id: string) => {
    const { data, error } = await getDb()
      .from('inspectors')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  getWithAssignments: async (inspectorId: string) => {
    const { data, error } = await getDb()
      .from('company_services')
      .select(`
        *,
        company:companies(id, name, address, lat, lng),
        service_type:service_types(id, name, name_ka)
      `)
      .eq('assigned_inspector_id', inspectorId)

    if (error) throw error
    return data
  },

  create: async (inspectorData: {
    full_name: string
    email: string
    phone: string
    specialty: string
    status: 'active'
  }) => {
    const { data, error } = await getDb()
      .from('inspectors')
      .insert(inspectorData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  update: async (id: string, updates: any) => {
    const { data, error } = await getDb()
      .from('inspectors')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  delete: async (id: string) => {
    const { error } = await getDb()
      .from('inspectors')
      .delete()
      .eq('id', id)

    if (error) throw error
  },
}
