// Board Template Hooks
// Query and mutation hooks for board template operations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userBoardsService } from '../services/user-boards.service'
import { queryKeys } from '@/lib/react-query'

export function useBoardTemplates() {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'board-templates'],
    queryFn: () => userBoardsService.getTemplates(),
    staleTime: 10 * 60 * 1000,
  })
}

export function useBoardTemplatesByCategory(category: string) {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'board-templates', 'category', category],
    queryFn: () => userBoardsService.getTemplatesByCategory(category),
    enabled: !!category,
  })
}

export function useFeaturedBoardTemplates() {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'board-templates', 'featured'],
    queryFn: () => userBoardsService.getFeaturedTemplates(),
  })
}

export function useBoardTemplate(templateId: string) {
  return useQuery({
    queryKey: [...queryKeys.routes.all, 'board-templates', 'detail', templateId],
    queryFn: () => userBoardsService.getTemplate(templateId),
    enabled: !!templateId,
  })
}

export function useSaveAsTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      boardId,
      templateData,
    }: {
      boardId: string
      templateData: {
        name: string
        description?: string
        category?: string
        is_featured?: boolean
      }
    }) => userBoardsService.saveAsTemplate(boardId, templateData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.routes.all, 'board-templates'],
      })
    },
  })
}
