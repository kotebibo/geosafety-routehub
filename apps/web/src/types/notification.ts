// Notification Types

export type NotificationType =
  | 'board_shared'
  | 'assignment_changed'
  | 'route_updated'
  | 'item_mention'
  | 'item_comment'
  | 'announcement_new'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  data: Record<string, any>
  is_read: boolean
  read_at: string | null
  created_at: string
}

export interface NotificationData {
  board_id?: string
  board_name?: string
  item_id?: string
  item_name?: string
  company_id?: string
  company_name?: string
  route_id?: string
  route_name?: string
  service_type_id?: string
  service_name?: string
  shared_by?: string
  mentioned_by?: string
  comment_by?: string
  role?: string
  announcement_id?: string
  announcement_title?: string
}
