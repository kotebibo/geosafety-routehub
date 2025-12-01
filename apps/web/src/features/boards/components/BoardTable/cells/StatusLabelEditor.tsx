import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { MONDAY_COLORS, type StatusOption } from './StatusCell'
import { useUpdateColumn } from '../../../hooks/useBoardColumns'
import { useToast } from '@/components/ui-monday/Toast'
import type { BoardColumn } from '@/types/board'

interface StatusLabelEditorProps {
  isOpen: boolean
  onClose: () => void
  column: BoardColumn
  currentOptions: StatusOption[]
}

// Color palette for the color picker (subset of most used colors)
const COLOR_PALETTE = [
  // Row 1 - Greens
  'grass_green', 'bright_green', 'saladish', 'aquamarine', 'river', 'winter',
  // Row 2 - Yellows/Oranges
  'egg_yolk', 'working_orange', 'dark_orange', 'peach', 'sunset', 'stuck_red',
  // Row 3 - Reds/Pinks
  'dark_red', 'sofia_pink', 'lipstick', 'bubble', 'purple', 'dark_purple',
  // Row 4 - Purples/Blues
  'berry', 'dark_indigo', 'indigo', 'navy', 'bright_blue', 'dark_blue',
  // Row 5 - Grays
  'chili_blue', 'explosive', 'american_gray', 'blackish',
]

export function StatusLabelEditor({
  isOpen,
  onClose,
  column,
  currentOptions,
}: StatusLabelEditorProps) {
  const [options, setOptions] = useState<StatusOption[]>(currentOptions)
  const [editingColorIndex, setEditingColorIndex] = useState<number | null>(null)
  const updateColumn = useUpdateColumn()
  const { showToast } = useToast()

  // Reset options when modal opens
  useEffect(() => {
    if (isOpen) {
      setOptions(currentOptions)
      setEditingColorIndex(null)
    }
  }, [isOpen, currentOptions])

  if (!isOpen) return null

  const handleLabelChange = (index: number, newLabel: string) => {
    setOptions(prev => prev.map((opt, i) =>
      i === index
        ? { ...opt, label: newLabel, key: newLabel.toLowerCase().replace(/\s+/g, '_') }
        : opt
    ))
  }

  const handleColorChange = (index: number, newColor: string) => {
    setOptions(prev => prev.map((opt, i) =>
      i === index ? { ...opt, color: newColor } : opt
    ))
    setEditingColorIndex(null)
  }

  const handleDelete = (index: number) => {
    if (options.length <= 1) {
      showToast('At least one status option is required', 'error')
      return
    }
    setOptions(prev => prev.filter((_, i) => i !== index))
  }

  const handleAddNew = () => {
    const newOption: StatusOption = {
      key: `status_${Date.now()}`,
      label: 'New Label',
      color: 'explosive',
    }
    setOptions(prev => [...prev, newOption])
  }

  const handleSave = async () => {
    try {
      await updateColumn.mutateAsync({
        columnId: column.id,
        updates: {
          config: {
            ...column.config,
            options: options,
          },
        },
      })
      showToast('Labels saved successfully', 'success')
      onClose()
    } catch (error) {
      showToast('Failed to save labels', 'error')
    }
  }

  const handleCancel = () => {
    setOptions(currentOptions)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className={cn(
        'relative bg-white rounded-lg shadow-xl',
        'w-full max-w-md mx-4',
        'flex flex-col max-h-[80vh]'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit Status Labels</h2>
          <button
            onClick={handleCancel}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-3">
            {options.map((option, index) => {
              const colorInfo = MONDAY_COLORS[option.color] || MONDAY_COLORS.explosive
              const isEditingColor = editingColorIndex === index

              return (
                <div key={option.key} className="space-y-2">
                  {/* Label Row */}
                  <div className="flex items-center gap-3">
                    {/* Color Indicator */}
                    <button
                      onClick={() => setEditingColorIndex(isEditingColor ? null : index)}
                      className={cn(
                        'w-8 h-8 rounded-md flex-shrink-0',
                        'transition-all hover:scale-105',
                        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                        isEditingColor && 'ring-2 ring-offset-2 ring-blue-500'
                      )}
                      style={{ backgroundColor: colorInfo.hex }}
                      title="Click to change color"
                    />

                    {/* Label Input */}
                    <input
                      type="text"
                      value={option.label}
                      onChange={(e) => handleLabelChange(index, e.target.value)}
                      className={cn(
                        'flex-1 px-3 py-2 rounded-md',
                        'border border-gray-300',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                        'text-sm'
                      )}
                    />

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(index)}
                      className={cn(
                        'p-2 hover:bg-red-50 rounded-md',
                        'text-gray-400 hover:text-red-500',
                        'transition-colors',
                        options.length <= 1 && 'opacity-30 cursor-not-allowed'
                      )}
                      disabled={options.length <= 1}
                      title="Delete label"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Color Picker Grid */}
                  {isEditingColor && (
                    <div className={cn(
                      'ml-11 p-3 bg-gray-50 rounded-lg',
                      'border border-gray-200'
                    )}>
                      <div className="grid grid-cols-6 gap-2">
                        {COLOR_PALETTE.map((colorKey) => {
                          const color = MONDAY_COLORS[colorKey]
                          if (!color) return null
                          const isSelected = option.color === colorKey
                          return (
                            <button
                              key={colorKey}
                              onClick={() => handleColorChange(index, colorKey)}
                              className={cn(
                                'w-7 h-7 rounded-full',
                                'transition-all hover:scale-110',
                                'focus:outline-none',
                                isSelected && 'ring-2 ring-offset-2 ring-gray-800'
                              )}
                              style={{ backgroundColor: color.hex }}
                              title={colorKey.replace(/_/g, ' ')}
                            >
                              {isSelected && (
                                <svg
                                  className="w-4 h-4 mx-auto"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke={color.text}
                                  strokeWidth={3}
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add New Label Button */}
          <button
            onClick={handleAddNew}
            className={cn(
              'mt-4 w-full py-2 px-4',
              'border-2 border-dashed border-gray-300 rounded-lg',
              'text-sm text-gray-500 font-medium',
              'hover:border-gray-400 hover:text-gray-600',
              'transition-colors',
              'flex items-center justify-center gap-2'
            )}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add new label
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className={cn(
              'px-4 py-2 rounded-md',
              'text-sm font-medium text-gray-700',
              'hover:bg-gray-100',
              'transition-colors'
            )}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={updateColumn.isPending}
            className={cn(
              'px-4 py-2 rounded-md',
              'text-sm font-medium text-white',
              'bg-blue-600 hover:bg-blue-700',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors'
            )}
          >
            {updateColumn.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
