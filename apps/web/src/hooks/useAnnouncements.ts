import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { announcementsService } from '@/services/announcements.service'

export function useAnnouncements() {
  const queryClient = useQueryClient()

  const {
    data: announcements = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => announcementsService.getAll(),
    staleTime: 60_000,
  })

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['announcements', 'unread-count'],
    queryFn: () => announcementsService.getUnreadCount(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const markAsReadMutation = useMutation({
    mutationFn: (announcementId: string) =>
      announcementsService.markAsRead(announcementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
    },
  })

  return {
    announcements,
    unreadCount,
    isLoading,
    error,
    refetch,
    markAsRead: markAsReadMutation.mutate,
  }
}
