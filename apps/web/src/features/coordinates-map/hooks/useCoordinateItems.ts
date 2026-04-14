import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { coordinatesMapService } from '@/services/coordinates-map.service'
import type { CoordinateItem } from '../types'

interface UseCoordinateItemsOptions {
  inspectorFilter?: string
  searchQuery?: string
}

export function useCoordinateItems(options: UseCoordinateItemsOptions = {}) {
  const { inspectorFilter, searchQuery } = options

  const {
    data: allItems = [],
    isLoading,
    error,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['coordinates-map', 'items'],
    queryFn: () => coordinatesMapService.getCoordinateItems(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
  })

  const inspectors = useMemo(() => {
    const set = new Set(allItems.map(i => i.inspector))
    return Array.from(set).sort()
  }, [allItems])

  const filteredItems = useMemo(() => {
    let items = allItems

    if (inspectorFilter) {
      items = items.filter(i => i.inspector === inspectorFilter)
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      items = items.filter(
        i =>
          i.name.toLowerCase().includes(q) ||
          i.sk.includes(q) ||
          i.inspector.toLowerCase().includes(q)
      )
    }

    return items
  }, [allItems, inspectorFilter, searchQuery])

  return {
    items: filteredItems,
    allItems,
    inspectors,
    isLoading,
    error,
    lastUpdated: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
  }
}
