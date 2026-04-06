import { useState, useEffect, useCallback } from 'react'
import {
  useBoardSubitemColumns,
  useBoardSubitemCounts,
  useCreateSubitem,
  useEnsureSubitemColumns,
} from './useBoardSubitems'
import type { BoardSubitem } from '../types/board'

export function useBoardSubitemsState(
  boardId: string,
  items: { id: string }[] | undefined,
  inspectorId: string | null | undefined
) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [subitemsByParent, setSubitemsByParent] = useState<Map<string, BoardSubitem[]>>(new Map())

  // Subitem columns for this board
  const { data: subitemColumns } = useBoardSubitemColumns(boardId)
  const ensureSubitemColumns = useEnsureSubitemColumns(boardId)

  // Batch subitem count fetch
  const allItemIds = (items || []).map(i => i.id)
  const { data: subitemCounts } = useBoardSubitemCounts(boardId, allItemIds, allItemIds.length > 0)

  // Create mutation
  const createSubitem = useCreateSubitem(boardId)

  const handleToggleExpandItem = useCallback(
    (itemId: string) => {
      setExpandedItems(prev => {
        const next = new Set(prev)
        if (next.has(itemId)) {
          next.delete(itemId)
        } else {
          next.add(itemId)
          // Ensure subitem columns exist when first expanding
          if (!subitemColumns || subitemColumns.length === 0) {
            ensureSubitemColumns.mutate()
          }
        }
        return next
      })
    },
    [subitemColumns, ensureSubitemColumns]
  )

  // Lazy-load subitems for expanded items
  useEffect(() => {
    if (expandedItems.size === 0) return

    const loadSubitems = async () => {
      const { boardSubitemsService } =
        await import('@/features/boards/services/board-subitems.service')
      const newMap = new Map(subitemsByParent)

      for (const itemId of expandedItems) {
        if (!newMap.has(itemId)) {
          try {
            const subs = await boardSubitemsService.getSubitems(itemId)
            newMap.set(itemId, subs)
          } catch {
            newMap.set(itemId, [])
          }
        }
      }

      // Remove collapsed items from map
      for (const key of newMap.keys()) {
        if (!expandedItems.has(key)) {
          newMap.delete(key)
        }
      }

      setSubitemsByParent(newMap)
    }

    loadSubitems()
  }, [expandedItems]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddSubitem = useCallback(
    (parentItemId: string) => {
      const currentSubs = subitemsByParent.get(parentItemId) || []
      const nextPosition = currentSubs.length

      createSubitem.mutate(
        {
          parent_item_id: parentItemId,
          name: '',
          position: nextPosition,
          created_by: inspectorId || undefined,
        },
        {
          onSuccess: newSubitem => {
            setSubitemsByParent(prev => {
              const next = new Map(prev)
              const existing = next.get(parentItemId) || []
              next.set(parentItemId, [...existing, newSubitem])
              return next
            })
          },
        }
      )
    },
    [subitemsByParent, createSubitem, inspectorId]
  )

  const handleSubitemCellEdit = useCallback(
    async (subitemId: string, field: string, value: any) => {
      const { boardSubitemsService } =
        await import('@/features/boards/services/board-subitems.service')
      const updates = field === 'data' ? { data: value } : { [field]: value }
      try {
        const updated = await boardSubitemsService.updateSubitem(subitemId, updates as any)
        setSubitemsByParent(prev => {
          const next = new Map(prev)
          for (const [parentId, subs] of next) {
            const idx = subs.findIndex(s => s.id === subitemId)
            if (idx >= 0) {
              const newSubs = [...subs]
              newSubs[idx] = updated
              next.set(parentId, newSubs)
              break
            }
          }
          return next
        })
      } catch (err) {
        console.error('Failed to update subitem:', err)
      }
    },
    []
  )

  const handleDeleteSubitem = useCallback(async (subitemId: string, parentItemId: string) => {
    const { boardSubitemsService } =
      await import('@/features/boards/services/board-subitems.service')
    try {
      await boardSubitemsService.deleteSubitem(subitemId)
      setSubitemsByParent(prev => {
        const next = new Map(prev)
        const subs = next.get(parentItemId) || []
        next.set(
          parentItemId,
          subs.filter(s => s.id !== subitemId)
        )
        return next
      })
    } catch (err) {
      console.error('Failed to delete subitem:', err)
    }
  }, [])

  return {
    expandedItems,
    subitemsByParent,
    subitemColumns,
    subitemCounts,
    onToggleExpandItem: handleToggleExpandItem,
    onAddSubitem: handleAddSubitem,
    onSubitemCellEdit: handleSubitemCellEdit,
    onDeleteSubitem: handleDeleteSubitem,
  }
}
