export type AnnouncementPriority = 'normal' | 'important' | 'urgent'

export interface Announcement {
  id: string
  title: string
  content: string
  priority: AnnouncementPriority
  author_id: string
  author_name?: string
  is_published: boolean
  created_at: string
  updated_at: string
  is_read?: boolean
  read_at?: string | null
}

export interface CreateAnnouncementInput {
  title: string
  content: string
  priority: AnnouncementPriority
  is_published?: boolean
}

export interface UpdateAnnouncementInput {
  title?: string
  content?: string
  priority?: AnnouncementPriority
  is_published?: boolean
}
