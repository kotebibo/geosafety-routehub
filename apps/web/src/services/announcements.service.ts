import { createClient } from '@/lib/supabase'
import type { Announcement } from '@/types/announcement'

const getDb = (): any => createClient()

export const announcementsService = {
  getAll: async (): Promise<Announcement[]> => {
    const { data, error } = await getDb().rpc('get_announcements_with_read_status')
    if (error) throw error
    return data || []
  },

  getById: async (id: string): Promise<Announcement | null> => {
    const { data, error } = await getDb()
      .from('announcements')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  },

  getUnreadCount: async (): Promise<number> => {
    const { data, error } = await getDb().rpc('get_unread_announcements_count')
    if (error) throw error
    return data || 0
  },

  markAsRead: async (announcementId: string): Promise<boolean> => {
    const { data, error } = await getDb().rpc('mark_announcement_read', {
      p_announcement_id: announcementId,
    })
    if (error) throw error
    return data ?? true
  },
}
