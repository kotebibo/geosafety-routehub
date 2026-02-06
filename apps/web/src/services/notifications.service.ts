// Notifications Service
// Handles CRUD operations for user notifications

import { createClient } from '@/lib/supabase'
import type { Notification, NotificationType, NotificationData } from '@/types/notification'

const getDb = (): any => createClient()

export const notificationsService = {
  /**
   * Get all notifications for the current user
   */
  async getNotifications(limit = 50): Promise<Notification[]> {
    const { data, error } = await getDb()
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  },

  /**
   * Get unread notifications for the current user
   */
  async getUnreadNotifications(): Promise<Notification[]> {
    const { data, error } = await getDb()
      .from('notifications')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const { data, error } = await getDb()
      .rpc('get_unread_notification_count')

    if (error) throw error
    return data || 0
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    const { data, error } = await getDb()
      .rpc('mark_notification_read', { p_notification_id: notificationId })

    if (error) throw error
    return data || false
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<number> {
    const { data, error } = await getDb()
      .rpc('mark_all_notifications_read')

    if (error) throw error
    return data || 0
  },

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await getDb()
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (error) throw error
  },

  /**
   * Delete all read notifications
   */
  async deleteReadNotifications(): Promise<void> {
    const { error } = await getDb()
      .from('notifications')
      .delete()
      .eq('is_read', true)

    if (error) throw error
  },

  /**
   * Create a notification (for client-side triggers like mentions)
   * Note: Most notifications are created server-side via database triggers
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: NotificationData = {}
  ): Promise<string> {
    const { data: result, error } = await getDb()
      .rpc('create_notification', {
        p_user_id: userId,
        p_type: type,
        p_title: title,
        p_message: message,
        p_data: data,
      })

    if (error) throw error
    return result
  },

  /**
   * Subscribe to real-time notification updates
   */
  subscribeToNotifications(
    userId: string,
    onNotification: (notification: Notification) => void
  ) {
    const subscription = getDb()
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          onNotification(payload.new as Notification)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  },
}
