import { useCallback, useEffect, useState, useRef } from 'react'
import type { BoardItem, BoardColumn } from '../types/board'

interface KeyboardNavigationOptions {
  items: BoardItem[]
  columns: BoardColumn[]
  onCellEdit?: (rowId: string, columnId: string, value: any) => void
  onRowClick?: (row: BoardItem) => void
  onSelectionChange?: (selection: Set<string>) => void
  selection?: Set<string>
  enabled?: boolean
}

interface FocusedCell {
  rowIndex: number
  columnIndex: number
}

export function useKeyboardNavigation({
  items,
  columns,
  onCellEdit,
  onRowClick,
  onSelectionChange,
  selection = new Set(),
  enabled = true,
}: KeyboardNavigationOptions) {
  const [focusedCell, setFocusedCell] = useState<FocusedCell | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)
  const clipboardRef = useRef<{ rowId: string; columnId: string; value: any } | null>(null)

  // Get visible columns
  const visibleColumns = columns.filter(col => col.is_visible)

  // Navigate to a cell
  const navigateToCell = useCallback((rowIndex: number, columnIndex: number) => {
    // Clamp values
    const newRowIndex = Math.max(0, Math.min(items.length - 1, rowIndex))
    const newColIndex = Math.max(0, Math.min(visibleColumns.length - 1, columnIndex))

    setFocusedCell({ rowIndex: newRowIndex, columnIndex: newColIndex })
    setIsEditing(false)
  }, [items.length, visibleColumns.length])

  // Start editing the current cell
  const startEditing = useCallback(() => {
    if (focusedCell && !isEditing) {
      setIsEditing(true)
    }
  }, [focusedCell, isEditing])

  // Stop editing
  const stopEditing = useCallback(() => {
    setIsEditing(false)
  }, [])

  // Get current focused item and column
  const getFocusedData = useCallback(() => {
    if (!focusedCell) return null
    const item = items[focusedCell.rowIndex]
    const column = visibleColumns[focusedCell.columnIndex]
    if (!item || !column) return null
    return { item, column }
  }, [focusedCell, items, visibleColumns])

  // Copy cell value to clipboard
  const copyCell = useCallback(() => {
    const data = getFocusedData()
    if (!data) return

    const { item, column } = data
    const value = column.column_id === 'name'
      ? item.name
      : item.data?.[column.column_id]

    // Store in internal clipboard
    clipboardRef.current = {
      rowId: item.id,
      columnId: column.column_id,
      value,
    }

    // Also copy to system clipboard as text
    const textValue = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')
    navigator.clipboard?.writeText(textValue).catch(() => {
      // Clipboard API not available
    })
  }, [getFocusedData])

  // Paste cell value
  const pasteCell = useCallback(async () => {
    const data = getFocusedData()
    if (!data || !onCellEdit) return

    const { item, column } = data

    // Try to get value from internal clipboard first
    if (clipboardRef.current) {
      onCellEdit(item.id, column.column_id, clipboardRef.current.value)
      return
    }

    // Fall back to system clipboard
    try {
      const text = await navigator.clipboard?.readText()
      if (text) {
        // Try to parse as JSON, otherwise use as string
        let value: any = text
        try {
          value = JSON.parse(text)
        } catch {
          // Keep as string
        }
        onCellEdit(item.id, column.column_id, value)
      }
    } catch {
      // Clipboard API not available
    }
  }, [getFocusedData, onCellEdit])

  // Toggle row selection
  const toggleSelection = useCallback(() => {
    const data = getFocusedData()
    if (!data || !onSelectionChange) return

    const newSelection = new Set(selection)
    if (newSelection.has(data.item.id)) {
      newSelection.delete(data.item.id)
    } else {
      newSelection.add(data.item.id)
    }
    onSelectionChange(newSelection)
  }, [getFocusedData, selection, onSelectionChange])

  // Open item detail
  const openItem = useCallback(() => {
    const data = getFocusedData()
    if (data && onRowClick) {
      onRowClick(data.item)
    }
  }, [getFocusedData, onRowClick])

  // Handle keyboard events
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input/textarea (unless it's our cell)
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // If editing a cell, let it handle its own input
      if (isEditing && isInput) {
        // Only capture Escape and Tab
        if (e.key === 'Escape') {
          e.preventDefault()
          stopEditing()
          return
        }
        if (e.key === 'Tab') {
          e.preventDefault()
          stopEditing()
          if (focusedCell) {
            if (e.shiftKey) {
              navigateToCell(focusedCell.rowIndex, focusedCell.columnIndex - 1)
            } else {
              navigateToCell(focusedCell.rowIndex, focusedCell.columnIndex + 1)
            }
          }
          return
        }
        return
      }

      // If no focused cell and not in our table, ignore
      if (!focusedCell && !tableRef.current?.contains(target)) {
        return
      }

      // Handle navigation keys
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          if (focusedCell) {
            navigateToCell(focusedCell.rowIndex - 1, focusedCell.columnIndex)
          } else {
            navigateToCell(0, 0)
          }
          break

        case 'ArrowDown':
          e.preventDefault()
          if (focusedCell) {
            navigateToCell(focusedCell.rowIndex + 1, focusedCell.columnIndex)
          } else {
            navigateToCell(0, 0)
          }
          break

        case 'ArrowLeft':
          e.preventDefault()
          if (focusedCell) {
            navigateToCell(focusedCell.rowIndex, focusedCell.columnIndex - 1)
          } else {
            navigateToCell(0, 0)
          }
          break

        case 'ArrowRight':
          e.preventDefault()
          if (focusedCell) {
            navigateToCell(focusedCell.rowIndex, focusedCell.columnIndex + 1)
          } else {
            navigateToCell(0, 0)
          }
          break

        case 'Tab':
          if (focusedCell) {
            e.preventDefault()
            if (e.shiftKey) {
              // Move left, or up to previous row's last column
              if (focusedCell.columnIndex > 0) {
                navigateToCell(focusedCell.rowIndex, focusedCell.columnIndex - 1)
              } else if (focusedCell.rowIndex > 0) {
                navigateToCell(focusedCell.rowIndex - 1, visibleColumns.length - 1)
              }
            } else {
              // Move right, or down to next row's first column
              if (focusedCell.columnIndex < visibleColumns.length - 1) {
                navigateToCell(focusedCell.rowIndex, focusedCell.columnIndex + 1)
              } else if (focusedCell.rowIndex < items.length - 1) {
                navigateToCell(focusedCell.rowIndex + 1, 0)
              }
            }
          }
          break

        case 'Enter':
          e.preventDefault()
          if (focusedCell) {
            if (e.shiftKey) {
              openItem()
            } else {
              startEditing()
            }
          }
          break

        case 'Escape':
          e.preventDefault()
          if (isEditing) {
            stopEditing()
          } else {
            setFocusedCell(null)
          }
          break

        case ' ':
          // Space to toggle selection
          if (focusedCell && !isEditing) {
            e.preventDefault()
            toggleSelection()
          }
          break

        case 'Home':
          e.preventDefault()
          if (e.ctrlKey || e.metaKey) {
            // Ctrl+Home: Go to first cell
            navigateToCell(0, 0)
          } else if (focusedCell) {
            // Home: Go to first column
            navigateToCell(focusedCell.rowIndex, 0)
          }
          break

        case 'End':
          e.preventDefault()
          if (e.ctrlKey || e.metaKey) {
            // Ctrl+End: Go to last cell
            navigateToCell(items.length - 1, visibleColumns.length - 1)
          } else if (focusedCell) {
            // End: Go to last column
            navigateToCell(focusedCell.rowIndex, visibleColumns.length - 1)
          }
          break

        case 'PageUp':
          e.preventDefault()
          if (focusedCell) {
            navigateToCell(focusedCell.rowIndex - 10, focusedCell.columnIndex)
          }
          break

        case 'PageDown':
          e.preventDefault()
          if (focusedCell) {
            navigateToCell(focusedCell.rowIndex + 10, focusedCell.columnIndex)
          }
          break

        case 'c':
          // Ctrl+C: Copy
          if ((e.ctrlKey || e.metaKey) && focusedCell) {
            e.preventDefault()
            copyCell()
          }
          break

        case 'v':
          // Ctrl+V: Paste
          if ((e.ctrlKey || e.metaKey) && focusedCell) {
            e.preventDefault()
            pasteCell()
          }
          break

        case 'a':
          // Ctrl+A: Select all
          if ((e.ctrlKey || e.metaKey) && onSelectionChange) {
            e.preventDefault()
            const allIds = new Set(items.map(item => item.id))
            onSelectionChange(allIds)
          }
          break

        case 'F2':
          // F2: Edit cell (like Excel)
          if (focusedCell) {
            e.preventDefault()
            startEditing()
          }
          break

        case 'Delete':
        case 'Backspace':
          // Clear cell content
          if (focusedCell && !isEditing && onCellEdit) {
            e.preventDefault()
            const data = getFocusedData()
            if (data) {
              onCellEdit(data.item.id, data.column.column_id, null)
            }
          }
          break

        default:
          // Start typing to edit (if single character and not modifier)
          if (
            focusedCell &&
            !isEditing &&
            e.key.length === 1 &&
            !e.ctrlKey &&
            !e.metaKey &&
            !e.altKey
          ) {
            startEditing()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    enabled,
    focusedCell,
    isEditing,
    items,
    visibleColumns,
    navigateToCell,
    startEditing,
    stopEditing,
    openItem,
    toggleSelection,
    copyCell,
    pasteCell,
    onCellEdit,
    onSelectionChange,
    getFocusedData,
  ])

  // Return utilities for the component
  return {
    tableRef,
    focusedCell,
    isEditing,
    setFocusedCell,
    setIsEditing,
    navigateToCell,
    startEditing,
    stopEditing,
    isCellFocused: (rowIndex: number, columnIndex: number) =>
      focusedCell?.rowIndex === rowIndex && focusedCell?.columnIndex === columnIndex,
    isCellEditing: (rowIndex: number, columnIndex: number) =>
      isEditing && focusedCell?.rowIndex === rowIndex && focusedCell?.columnIndex === columnIndex,
  }
}

// Keyboard shortcuts help component
export function KeyboardShortcutsHelp() {
  return (
    <div className="text-xs text-text-tertiary space-y-1">
      <div className="font-medium text-text-secondary mb-2">Keyboard Shortcuts</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <div><kbd className="px-1 bg-bg-tertiary rounded">↑↓←→</kbd> Navigate</div>
        <div><kbd className="px-1 bg-bg-tertiary rounded">Enter</kbd> Edit cell</div>
        <div><kbd className="px-1 bg-bg-tertiary rounded">Tab</kbd> Next cell</div>
        <div><kbd className="px-1 bg-bg-tertiary rounded">Esc</kbd> Cancel</div>
        <div><kbd className="px-1 bg-bg-tertiary rounded">Space</kbd> Select row</div>
        <div><kbd className="px-1 bg-bg-tertiary rounded">Ctrl+C</kbd> Copy</div>
        <div><kbd className="px-1 bg-bg-tertiary rounded">Ctrl+V</kbd> Paste</div>
        <div><kbd className="px-1 bg-bg-tertiary rounded">Ctrl+A</kbd> Select all</div>
        <div><kbd className="px-1 bg-bg-tertiary rounded">Delete</kbd> Clear cell</div>
        <div><kbd className="px-1 bg-bg-tertiary rounded">Shift+Enter</kbd> Open item</div>
      </div>
    </div>
  )
}
