import { useCallback } from 'react'
import { useUndoRedo, type UndoableAction } from './useUndoRedo'
import type { BoardItem } from '../types/board'

interface UseBoardUndoRedoParams {
  items: BoardItem[] | undefined
  updateItem: { mutateAsync: (args: { itemId: string; updates: any }) => Promise<any> }
  updateGroup: { mutateAsync: (args: { groupId: string; updates: any }) => Promise<any> }
  showToast: (message: string, type: 'success' | 'error' | 'warning') => void
}

export function useBoardUndoRedo({
  items,
  updateItem,
  updateGroup,
  showToast,
}: UseBoardUndoRedoParams) {
  const handleUndoAction = useCallback(async (action: UndoableAction) => {
    try {
      switch (action.type) {
        case 'cell_edit': {
          const currentItem = items?.find(item => item.id === action.targetId)
          if (currentItem && action.metadata?.columnId) {
            if (action.metadata.columnId === 'name') {
              await updateItem.mutateAsync({
                itemId: action.targetId,
                updates: { name: action.previousValue },
              })
            } else {
              await updateItem.mutateAsync({
                itemId: action.targetId,
                updates: {
                  data: { ...currentItem.data, [action.metadata.columnId]: action.previousValue },
                },
              })
            }
          }
          break
        }
        case 'group_rename':
          await updateGroup.mutateAsync({
            groupId: action.targetId,
            updates: { name: action.previousValue },
          })
          break
        case 'group_color_change':
          await updateGroup.mutateAsync({
            groupId: action.targetId,
            updates: { color: action.previousValue },
          })
          break
        default:
          console.log('Undo not implemented for:', action.type)
      }
      showToast('Undone', 'success')
    } catch (error) {
      console.error('Failed to undo:', error)
      showToast('Failed to undo', 'error')
    }
  }, [items, updateItem, updateGroup, showToast])

  const handleRedoAction = useCallback(async (action: UndoableAction) => {
    try {
      switch (action.type) {
        case 'cell_edit': {
          const currentItem = items?.find(item => item.id === action.targetId)
          if (currentItem && action.metadata?.columnId) {
            if (action.metadata.columnId === 'name') {
              await updateItem.mutateAsync({
                itemId: action.targetId,
                updates: { name: action.newValue },
              })
            } else {
              await updateItem.mutateAsync({
                itemId: action.targetId,
                updates: {
                  data: { ...currentItem.data, [action.metadata.columnId]: action.newValue },
                },
              })
            }
          }
          break
        }
        case 'group_rename':
          await updateGroup.mutateAsync({
            groupId: action.targetId,
            updates: { name: action.newValue },
          })
          break
        case 'group_color_change':
          await updateGroup.mutateAsync({
            groupId: action.targetId,
            updates: { color: action.newValue },
          })
          break
        default:
          console.log('Redo not implemented for:', action.type)
      }
      showToast('Redone', 'success')
    } catch (error) {
      console.error('Failed to redo:', error)
      showToast('Failed to redo', 'error')
    }
  }, [items, updateItem, updateGroup, showToast])

  return useUndoRedo({
    onUndo: handleUndoAction,
    onRedo: handleRedoAction,
  })
}
