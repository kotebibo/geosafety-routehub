'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsService } from '@/services/notifications.service'
import { useAuth } from '@/contexts/AuthContext'
import type { Notification } from '@/types/notification'

export function useNotifications() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Fetch notifications
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.getNotifications(),
    enabled: !!user,
    staleTime: 30000, // 30 seconds
  })

  // Fetch unread count
  const { data: unreadCount = 0, refetch: refetchCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsService.getUnreadCount(),
    enabled: !!user,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      notificationsService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: string) =>
      notificationsService.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) return

    const unsubscribe = notificationsService.subscribeToNotifications(
      user.id,
      (newNotification) => {
        // Add to cache immediately
        queryClient.setQueryData<Notification[]>(['notifications'], (old) => {
          if (!old) return [newNotification]
          return [newNotification, ...old]
        })
        // Update unread count
        queryClient.setQueryData<number>(['notifications', 'unread-count'], (old) => {
          return (old || 0) + 1
        })
      }
    )

    return () => {
      unsubscribe()
    }
  }, [user?.id, queryClient])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  }
}
