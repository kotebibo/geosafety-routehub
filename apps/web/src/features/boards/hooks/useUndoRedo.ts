import { useState, useCallback, useEffect } from 'react'

/**
 * Action types that can be undone/redone
 */
export type UndoableActionType =
  | 'cell_edit'
  | 'item_create'
  | 'item_delete'
  | 'item_duplicate'
  | 'group_create'
  | 'group_delete'
  | 'group_rename'
  | 'group_color_change'
  | 'column_create'
  | 'column_delete'
  | 'column_rename'
  | 'column_reorder'

/**
 * An action that can be undone/redone
 */
export interface UndoableAction {
  id: string
  type: UndoableActionType
  timestamp: number
  description: string

  // Data needed to undo/redo
  targetId: string // ID of the affected item/group/column
  targetType: 'item' | 'group' | 'column'

  // Before and after values
  previousValue: any
  newValue: any

  // Additional context
  metadata?: Record<string, any>
}

/**
 * State for the undo/redo stack
 */
interface UndoRedoState {
  undoStack: UndoableAction[]
  redoStack: UndoableAction[]
  maxStackSize: number
}

/**
 * Return type for the useUndoRedo hook
 */
interface UseUndoRedoReturn {
  // State
  canUndo: boolean
  canRedo: boolean
  undoStack: UndoableAction[]
  redoStack: UndoableAction[]

  // Actions
  pushAction: (action: Omit<UndoableAction, 'id' | 'timestamp'>) => void
  undo: () => UndoableAction | null
  redo: () => UndoableAction | null
  clear: () => void

  // Get last action for display
  lastAction: UndoableAction | null
  nextRedoAction: UndoableAction | null
}

/**
 * Hook for managing undo/redo functionality
 *
 * Usage:
 * ```tsx
 * const { canUndo, canRedo, pushAction, undo, redo } = useUndoRedo({
 *   onUndo: (action) => { /* revert the action * / },
 *   onRedo: (action) => { /* reapply the action * / },
 * })
 *
 * // When user makes a change:
 * pushAction({
 *   type: 'cell_edit',
 *   description: 'Edit cell value',
 *   targetId: itemId,
 *   targetType: 'item',
 *   previousValue: oldValue,
 *   newValue: newValue,
 * })
 *
 * // To undo:
 * const action = undo()
 * if (action) {
 *   await updateItem(action.targetId, { [columnId]: action.previousValue })
 * }
 * ```
 */
export function useUndoRedo(options?: {
  maxStackSize?: number
  onUndo?: (action: UndoableAction) => Promise<void> | void
  onRedo?: (action: UndoableAction) => Promise<void> | void
}): UseUndoRedoReturn {
  const { maxStackSize = 50, onUndo, onRedo } = options || {}

  const [state, setState] = useState<UndoRedoState>({
    undoStack: [],
    redoStack: [],
    maxStackSize,
  })

  /**
   * Push a new action onto the undo stack
   */
  const pushAction = useCallback((action: Omit<UndoableAction, 'id' | 'timestamp'>) => {
    const fullAction: UndoableAction = {
      ...action,
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    }

    setState((prev) => ({
      ...prev,
      undoStack: [fullAction, ...prev.undoStack].slice(0, prev.maxStackSize),
      redoStack: [], // Clear redo stack when new action is pushed
    }))
  }, [])

  /**
   * Undo the last action
   */
  const undo = useCallback(() => {
    let actionToUndo: UndoableAction | null = null

    setState((prev) => {
      if (prev.undoStack.length === 0) return prev

      const [action, ...rest] = prev.undoStack
      actionToUndo = action

      return {
        ...prev,
        undoStack: rest,
        redoStack: [action, ...prev.redoStack].slice(0, prev.maxStackSize),
      }
    })

    if (actionToUndo && onUndo) {
      onUndo(actionToUndo)
    }

    return actionToUndo
  }, [onUndo])

  /**
   * Redo the last undone action
   */
  const redo = useCallback(() => {
    let actionToRedo: UndoableAction | null = null

    setState((prev) => {
      if (prev.redoStack.length === 0) return prev

      const [action, ...rest] = prev.redoStack
      actionToRedo = action

      return {
        ...prev,
        redoStack: rest,
        undoStack: [action, ...prev.undoStack].slice(0, prev.maxStackSize),
      }
    })

    if (actionToRedo && onRedo) {
      onRedo(actionToRedo)
    }

    return actionToRedo
  }, [onRedo])

  /**
   * Clear all history
   */
  const clear = useCallback(() => {
    setState((prev) => ({
      ...prev,
      undoStack: [],
      redoStack: [],
    }))
  }, [])

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z for undo, Ctrl+Shift+Z or Ctrl+Y for redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault()
          redo()
        } else {
          e.preventDefault()
          undo()
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  return {
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0,
    undoStack: state.undoStack,
    redoStack: state.redoStack,
    pushAction,
    undo,
    redo,
    clear,
    lastAction: state.undoStack[0] || null,
    nextRedoAction: state.redoStack[0] || null,
  }
}

/**
 * Get a human-readable description for an action type
 */
export function getActionDescription(action: UndoableAction): string {
  switch (action.type) {
    case 'cell_edit':
      return `Edit ${action.metadata?.columnName || 'cell'}`
    case 'item_create':
      return 'Create item'
    case 'item_delete':
      return 'Delete item'
    case 'item_duplicate':
      return 'Duplicate item'
    case 'group_create':
      return 'Create group'
    case 'group_delete':
      return `Delete group "${action.previousValue?.name || 'group'}"`
    case 'group_rename':
      return `Rename group to "${action.newValue}"`
    case 'group_color_change':
      return 'Change group color'
    case 'column_create':
      return `Add column "${action.newValue?.column_name || 'column'}"`
    case 'column_delete':
      return `Delete column "${action.previousValue?.column_name || 'column'}"`
    case 'column_rename':
      return `Rename column to "${action.newValue}"`
    case 'column_reorder':
      return 'Reorder columns'
    default:
      return action.description
  }
}
