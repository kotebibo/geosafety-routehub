import { createClient } from '@/lib/supabase'

// Helper to get supabase client with current auth state
const getDb = () => createClient()

export const assignmentsService = {
  bulkAssign: async (companyServiceIds: string[], inspectorId: string | null) => {
    const { error } = await (getDb()
      .from('company_services') as any)
      .update({ assigned_inspector_id: inspectorId })
      .in('id', companyServiceIds)
    
    if (error) throw error
  },

  getByServiceType: async (serviceTypeId?: string) => {
    let query = (getDb()
      .from('company_services') as any)
      .select(`
        *,
        company:companies(id, name, address, lat, lng),
        service_type:service_types(id, name, name_ka),
        assigned_inspector:inspectors(id, full_name)
      `)
    
    if (serviceTypeId && serviceTypeId !== 'all') {
      // Check if it's a UUID (contains hyphens) or a service name
      if (serviceTypeId.includes('-')) {
        // It's a UUID, use it directly
        query = query.eq('service_type_id', serviceTypeId)
      } else {
        // It's a service code name like "personal_data_protection"
        // We need to first get the service type UUID
        const { data: serviceType, error: stError } = await (getDb()
          .from('service_types') as any)
          .select('id')
          .eq('name', serviceTypeId)
          .single()
        
        if (stError || !serviceType) {
          console.warn(`Could not find service type with name "${serviceTypeId}". Returning all assignments.`)
          // Don't add any filter - return all
        } else {
          query = query.eq('service_type_id', serviceType.id)
        }
      }
    }
    
    const { data, error } = await query.order('company(name)')
    
    if (error) throw error
    return data || []
  },

  getStatistics: async () => {
    const { data: all, error: allError } = await (getDb()
      .from('company_services') as any)
      .select('id, assigned_inspector_id')
    
    if (allError) throw allError
    
    const total = all.length
    const assigned = all.filter((cs: any) => cs.assigned_inspector_id).length
    const unassigned = total - assigned
    
    return { total, assigned, unassigned }
  },

  getInspectorWorkload: async () => {
    const { data: inspectors, error: inspError } = await getDb()
      .from('inspectors')
      .select('id, full_name, specialty')
      .eq('status', 'active')
      .order('full_name')
    
    if (inspError) throw inspError
    
    const { data: assignments, error: assignError } = await getDb()
      .from('company_services')
      .select('assigned_inspector_id')
      .not('assigned_inspector_id', 'is', null)
    
    if (assignError) throw assignError
    
    const workload = inspectors.map((inspector: any) => {
      const count = assignments.filter(
        (a: any) => a.assigned_inspector_id === inspector.id
      ).length
      
      return {
        ...inspector,
        assignedCount: count,
      }
    })
    
    return workload
  },
}
