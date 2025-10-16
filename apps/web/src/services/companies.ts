import { getSupabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Company = Database['public']['Tables']['companies']['Row']

export class CompaniesService {
  private supabase = getSupabase()

  async getCompanies(filters?: {
    type?: string
    status?: string
    search?: string
  }) {
    let query = this.supabase
      .from('companies')
      .select('*')
      .order('name', { ascending: true })

    if (filters?.type) {
      query = query.eq('type', filters.type)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  }

  async getCompany(id: string) {
    const { data, error } = await this.supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async createCompany(company: Partial<Company>) {
    const { data, error } = await this.supabase
      .from('companies')
      .insert(company)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateCompany(id: string, updates: Partial<Company>) {
    const { data, error } = await this.supabase
      .from('companies')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteCompany(id: string) {
    const { error } = await this.supabase
      .from('companies')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  async getCompaniesDueForInspection(daysAhead: number = 30) {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysAhead)

    const { data, error } = await this.supabase
      .from('companies')
      .select('*')
      .lte('next_inspection_date', futureDate.toISOString())
      .eq('status', 'active')
      .order('next_inspection_date', { ascending: true })

    if (error) throw error
    return data
  }
}

export const companiesService = new CompaniesService()