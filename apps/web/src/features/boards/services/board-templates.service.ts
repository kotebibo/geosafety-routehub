// Board Templates Service
// Handles board template operations: get, filter, save

import { createClient } from '@/lib/supabase'
import type { BoardTemplate } from '@/types/board'

const getSupabase = (): any => createClient()

export const boardTemplatesService = {
  async getTemplates(): Promise<BoardTemplate[]> {
    const { data, error } = await (getSupabase() as any)
      .from('board_templates')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  },

  async getTemplatesByCategory(category: string): Promise<BoardTemplate[]> {
    const { data, error } = await (getSupabase() as any)
      .from('board_templates')
      .select('*')
      .eq('category', category)
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  },

  async getFeaturedTemplates(): Promise<BoardTemplate[]> {
    const { data, error } = await (getSupabase() as any)
      .from('board_templates')
      .select('*')
      .eq('is_featured', true)
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  },

  async getTemplate(templateId: string): Promise<BoardTemplate> {
    const { data, error } = await (getSupabase() as any)
      .from('board_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (error) throw error
    return data
  },
}
