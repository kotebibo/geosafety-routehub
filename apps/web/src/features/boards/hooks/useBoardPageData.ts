import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useInspectorId } from '@/hooks/useInspectorId'
import {
  useBoard,
  useBoardItems,
  useBoardGroups,
  useCreateBoardGroup,
  useUpdateBoardGroup,
  useDeleteBoardGroup,
  useCreateBoardItem,
  useUpdateBoardItem,
  useDuplicateBoardItems,
  useDeleteBoardItem,
} from './useUserBoards'
import { useBoardColumns } from './useBoardColumns'
import { useCreateUpdate } from './useActivity'
import type { BoardItem } from '../types/board'
import type { ExportLookups } from '../utils/exportBoard'

const DEFAULT_GROUP_COLOR = '#579bfc'

export function useBoardPageData(boardId: string) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { data: inspectorId } = useInspectorId(user?.email)

  // Data queries
  const { data: board, isLoading: boardLoading, error: boardError } = useBoard(boardId)
  const { data: items, isLoading: itemsLoading, error: itemsError } = useBoardItems(boardId)
  const { data: columns, refetch: refetchColumns } = useBoardColumns(board?.board_type || 'custom', boardId)
  const { data: dbGroups, isLoading: groupsLoading } = useBoardGroups(boardId)

  const groups = useMemo(() => dbGroups || [], [dbGroups])

  // Mutations
  const createItem = useCreateBoardItem(boardId)
  const updateItem = useUpdateBoardItem(boardId)
  const duplicateItems = useDuplicateBoardItems(boardId)
  const deleteItem = useDeleteBoardItem(boardId)
  const createUpdate = useCreateUpdate()
  const createGroup = useCreateBoardGroup(boardId)
  const updateGroup = useUpdateBoardGroup(boardId)
  const deleteGroup = useDeleteBoardGroup(boardId)

  // Auto-create default group for boards that have none
  const hasAutoCreatedGroup = useRef(false)
  useEffect(() => {
    if (
      board &&
      !groupsLoading &&
      dbGroups &&
      dbGroups.length === 0 &&
      !hasAutoCreatedGroup.current &&
      !createGroup.isPending
    ) {
      hasAutoCreatedGroup.current = true
      createGroup.mutate({
        name: 'Items',
        color: DEFAULT_GROUP_COLOR,
        position: 0,
      })
    }
  }, [board, groupsLoading, dbGroups, createGroup])

  // Deep-link to specific item from global search (?item=<id>)
  const [selectedItem, setSelectedItem] = useState<BoardItem | null>(null)
  const deepLinkedItemRef = useRef(false)
  useEffect(() => {
    const targetItemId = searchParams.get('item')
    if (!targetItemId || !items || items.length === 0 || deepLinkedItemRef.current) return

    const targetItem = items.find((item: BoardItem) => item.id === targetItemId)
    if (targetItem) {
      deepLinkedItemRef.current = true
      setSelectedItem(targetItem)
      router.replace(`/boards/${boardId}`, { scroll: false })
    }
  }, [searchParams, items, boardId, router])

  // Lazy lookup data for export
  const [lookups, setLookups] = useState<ExportLookups | null>(null)
  const [lookupsLoading, setLookupsLoading] = useState(false)

  const fetchLookups = useCallback(async () => {
    if (lookups) return lookups
    setLookupsLoading(true)
    try {
      const [companiesModule, routesModule, inspectorsModule, supabaseModule] = await Promise.all([
        import('@/services/companies.service'),
        import('@/services/routes.service'),
        import('@/services/inspectors.service'),
        import('@/lib/supabase'),
      ])

      const supabase = supabaseModule.createClient() as any

      const [companies, routes, inspectors, serviceTypesResult] = await Promise.all([
        companiesModule.companiesService.getAll(),
        routesModule.routesService.getAll(),
        inspectorsModule.inspectorsService.getActive(),
        supabase.from('service_types').select('id, name').eq('is_active', true),
      ])

      const serviceTypes = serviceTypesResult.data || []

      const newLookups: ExportLookups = {
        persons: new Map(inspectors.map((i: any) => [i.id, i.full_name])),
        companies: new Map(companies.map((c: any) => [c.id, c.name])),
        routes: new Map(routes.map((r: any) => [r.id, r.name])),
        serviceTypes: new Map(serviceTypes.map((s: any) => [s.id, s.name])),
      }
      setLookups(newLookups)
      return newLookups
    } finally {
      setLookupsLoading(false)
    }
  }, [lookups])

  return {
    // Auth
    user,
    inspectorId,
    // Data
    board,
    items,
    columns,
    groups,
    // Loading/error
    boardLoading,
    itemsLoading,
    itemsError,
    groupsLoading,
    // Mutations
    createItem,
    updateItem,
    duplicateItems,
    deleteItem,
    createUpdate,
    createGroup,
    updateGroup,
    deleteGroup,
    // Column refetch
    refetchColumns,
    // Deep-link item
    selectedItem,
    setSelectedItem,
    // Lookups
    fetchLookups,
  }
}
