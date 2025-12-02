import { QueryClient, DefaultOptions } from '@tanstack/react-query'

// Default options for React Query
const queryConfig: DefaultOptions = {
  queries: {
    // Stale time: how long data is considered fresh
    staleTime: 30 * 1000, // 30 seconds

    // Cache time: how long unused data stays in cache
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)

    // Retry failed requests
    retry: (failureCount, error: any) => {
      // Don't retry on 404s or auth errors
      if (error?.status === 404 || error?.status === 401 || error?.status === 403) {
        return false
      }
      // Retry up to 2 times for other errors
      return failureCount < 2
    },

    // Retry delay with exponential backoff
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    // Refetch on window focus for real-time data
    refetchOnWindowFocus: true,

    // Refetch on reconnect
    refetchOnReconnect: true,

    // Don't refetch on mount if data is fresh
    refetchOnMount: true,
  },
  mutations: {
    // Retry mutations once on failure
    retry: 1,
  },
}

// Create a client
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: queryConfig,
  })
}

// Query keys factory for type-safe query keys
export const queryKeys = {
  // Routes
  routes: {
    all: ['routes'] as const,
    lists: () => [...queryKeys.routes.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.routes.lists(), filters] as const,
    details: () => [...queryKeys.routes.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.routes.details(), id] as const,
  },

  // Companies
  companies: {
    all: ['companies'] as const,
    lists: () => [...queryKeys.companies.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.companies.lists(), filters] as const,
    details: () => [...queryKeys.companies.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.companies.details(), id] as const,
  },

  // Inspectors
  inspectors: {
    all: ['inspectors'] as const,
    lists: () => [...queryKeys.inspectors.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.inspectors.lists(), filters] as const,
    details: () => [...queryKeys.inspectors.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.inspectors.details(), id] as const,
  },

  // Inspections
  inspections: {
    all: ['inspections'] as const,
    lists: () => [...queryKeys.inspections.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.inspections.lists(), filters] as const,
    details: () => [...queryKeys.inspections.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.inspections.details(), id] as const,
  },

  // Board columns
  boardColumns: {
    all: ['board-columns'] as const,
    byType: (boardType: string) => [...queryKeys.boardColumns.all, boardType] as const,
  },

  // Board views
  boardViews: {
    all: ['board-views'] as const,
    byType: (boardType: string) => [...queryKeys.boardViews.all, boardType] as const,
    detail: (id: string) => [...queryKeys.boardViews.all, id] as const,
  },

  // Activity
  activity: {
    all: ['activity'] as const,
    byItem: (itemType: string, itemId: string) =>
      [...queryKeys.activity.all, itemType, itemId] as const,
  },

  // Comments
  comments: {
    all: ['comments'] as const,
    byItem: (itemType: string, itemId: string) =>
      [...queryKeys.comments.all, itemType, itemId] as const,
  },

  // User settings
  userSettings: {
    all: ['user-settings'] as const,
    detail: (userId: string) => [...queryKeys.userSettings.all, userId] as const,
  },
} as const

// Helper function to invalidate all related queries when an item changes
export function getInvalidationKeys(itemType: string, itemId?: string) {
  const keys: readonly unknown[][] = []

  switch (itemType) {
    case 'route':
      (keys as unknown[][]).push([...queryKeys.routes.lists()])
      if (itemId) (keys as unknown[][]).push([...queryKeys.routes.detail(itemId)])
      break
    case 'company':
      (keys as unknown[][]).push([...queryKeys.companies.lists()])
      if (itemId) (keys as unknown[][]).push([...queryKeys.companies.detail(itemId)])
      break
    case 'inspector':
      (keys as unknown[][]).push([...queryKeys.inspectors.lists()])
      if (itemId) (keys as unknown[][]).push([...queryKeys.inspectors.detail(itemId)])
      break
    case 'inspection':
      (keys as unknown[][]).push([...queryKeys.inspections.lists()])
      if (itemId) (keys as unknown[][]).push([...queryKeys.inspections.detail(itemId)])
      break
  }

  return keys
}
