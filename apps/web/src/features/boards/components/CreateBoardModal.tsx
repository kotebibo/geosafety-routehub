'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { X, Plus, Check, Briefcase, Users, CheckSquare, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui-monday'
import { useCreateBoard, useCreateBoardFromTemplate, useBoardTemplates } from '../hooks'
import { useAuth } from '@/contexts/AuthContext'
import { useInspectorId } from '@/hooks/useInspectorId'
import type { BoardTemplate, BoardType } from '@/types/board'

interface CreateBoardModalProps {
  isOpen: boolean
  onClose: () => void
  onBoardCreated?: (boardId: string) => void
}

const ICON_MAP = {
  briefcase: Briefcase,
  users: Users,
  'check-square': CheckSquare,
  board: TrendingUp,
}

const COLOR_OPTIONS = [
  { name: 'Blue', value: 'blue', class: 'bg-monday-primary' },
  { name: 'Green', value: 'green', class: 'bg-status-done' },
  { name: 'Red', value: 'red', class: 'bg-status-stuck' },
  { name: 'Yellow', value: 'yellow', class: 'bg-status-working' },
  { name: 'Purple', value: 'purple', class: 'bg-purple-500' },
  { name: 'Orange', value: 'orange', class: 'bg-orange-500' },
]

export function CreateBoardModal({ isOpen, onClose, onBoardCreated }: CreateBoardModalProps) {
  const { user } = useAuth()
  const { data: inspectorId, isLoading: inspectorLoading } = useInspectorId(user?.email)
  const [step, setStep] = useState<'method' | 'template' | 'custom'>('method')
  const [boardName, setBoardName] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<BoardTemplate | null>(null)
  const [selectedColor, setSelectedColor] = useState('blue')

  const { data: templates, isLoading: templatesLoading } = useBoardTemplates()
  const createBoard = useCreateBoard(inspectorId || '')
  const createFromTemplate = useCreateBoardFromTemplate(inspectorId || '')

  const handleCreateBlankBoard = async () => {
    if (!boardName.trim() || !user || !inspectorId) return

    try {
      const newBoard = await createBoard.mutateAsync({
        owner_id: inspectorId,
        board_type: 'custom',
        name: boardName,
        icon: 'board',
        color: selectedColor,
        is_template: false,
        is_public: false,
        settings: {
          allowComments: true,
          allowActivityFeed: true,
          defaultView: 'table',
          permissions: {
            canEdit: [],
            canView: [],
          },
        },
      })

      onBoardCreated?.(newBoard.id)
      handleClose()
    } catch (error) {
      console.error('Failed to create board:', error)
    }
  }

  const handleCreateFromTemplate = async () => {
    if (!boardName.trim() || !selectedTemplate || !user || !inspectorId) return

    try {
      const newBoard = await createFromTemplate.mutateAsync({
        templateId: selectedTemplate.id,
        name: boardName,
      })

      onBoardCreated?.(newBoard.id)
      handleClose()
    } catch (error) {
      console.error('Failed to create board from template:', error)
    }
  }

  const handleClose = () => {
    setBoardName('')
    setSelectedTemplate(null)
    setSelectedColor('blue')
    setStep('method')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-bg-primary rounded-lg shadow-monday-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <h2 className="text-h3 font-semibold text-text-primary">
            Create New Board
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-md hover:bg-bg-hover transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Step 1: Choose Method */}
          {step === 'method' && (
            <div className="space-y-4">
              <p className="text-text-secondary text-sm">
                How would you like to create your board?
              </p>

              <div className="grid grid-cols-2 gap-4">
                {/* Blank Board */}
                <button
                  onClick={() => setStep('custom')}
                  className={cn(
                    'p-6 rounded-lg border-2 border-border-light',
                    'hover:border-monday-primary hover:bg-bg-hover',
                    'transition-all text-left'
                  )}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg bg-monday-primary/10 flex items-center justify-center">
                      <Plus className="w-6 h-6 text-monday-primary" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-text-primary mb-1">
                    Start from Scratch
                  </h3>
                  <p className="text-sm text-text-tertiary">
                    Create a blank board and customize it your way
                  </p>
                </button>

                {/* From Template */}
                <button
                  onClick={() => setStep('template')}
                  className={cn(
                    'p-6 rounded-lg border-2 border-border-light',
                    'hover:border-monday-primary hover:bg-bg-hover',
                    'transition-all text-left'
                  )}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg bg-status-done/10 flex items-center justify-center">
                      <CheckSquare className="w-6 h-6 text-status-done" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-text-primary mb-1">
                    Use a Template
                  </h3>
                  <p className="text-sm text-text-tertiary">
                    Choose from pre-built templates to get started faster
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Select Template */}
          {step === 'template' && (
            <div className="space-y-4">
              <button
                onClick={() => setStep('method')}
                className="text-sm text-monday-primary hover:underline"
              >
                ← Back
              </button>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Board Name
                </label>
                <input
                  type="text"
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                  placeholder="My Board"
                  className={cn(
                    'w-full px-4 py-2 rounded-md',
                    'border border-border-default',
                    'focus:ring-2 focus:ring-monday-primary focus:border-transparent',
                    'text-text-primary placeholder-text-tertiary',
                    'transition-all'
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-3">
                  Choose a Template
                </label>

                {templatesLoading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-monday-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {templates?.map((template) => {
                    const IconComponent = ICON_MAP[template.icon as keyof typeof ICON_MAP] || TrendingUp
                    const isSelected = selectedTemplate?.id === template.id

                    return (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template)}
                        className={cn(
                          'p-4 rounded-lg border-2 text-left',
                          'transition-all',
                          isSelected
                            ? 'border-monday-primary bg-monday-primary/5'
                            : 'border-border-light hover:border-monday-primary/50 hover:bg-bg-hover'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                              `bg-${template.color}-500/10`
                            )}
                          >
                            <IconComponent className={cn('w-5 h-5', `text-${template.color}-500`)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-text-primary truncate">
                                {template.name}
                              </h3>
                              {isSelected && (
                                <Check className="w-4 h-4 text-monday-primary flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-text-tertiary mt-0.5 line-clamp-2">
                              {template.description}
                            </p>
                            {template.category && (
                              <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs bg-bg-secondary text-text-secondary">
                                {template.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Custom Board */}
          {step === 'custom' && (
            <div className="space-y-4">
              <button
                onClick={() => setStep('method')}
                className="text-sm text-monday-primary hover:underline"
              >
                ← Back
              </button>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Board Name
                </label>
                <input
                  type="text"
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                  placeholder="My Board"
                  autoFocus
                  className={cn(
                    'w-full px-4 py-2 rounded-md',
                    'border border-border-default',
                    'focus:ring-2 focus:ring-monday-primary focus:border-transparent',
                    'text-text-primary placeholder-text-tertiary',
                    'transition-all'
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-3">
                  Choose a Color
                </label>
                <div className="flex items-center gap-3">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      className={cn(
                        'w-10 h-10 rounded-lg transition-all',
                        color.class,
                        selectedColor === color.value
                          ? 'ring-2 ring-offset-2 ring-monday-primary scale-110'
                          : 'hover:scale-105'
                      )}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-light">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>

          {step === 'template' && (
            <Button
              variant="primary"
              onClick={handleCreateFromTemplate}
              disabled={!boardName.trim() || !selectedTemplate || !inspectorId || createFromTemplate.isPending}
            >
              {createFromTemplate.isPending ? 'Creating...' : 'Create Board'}
            </Button>
          )}

          {step === 'custom' && (
            <Button
              variant="primary"
              onClick={handleCreateBlankBoard}
              disabled={!boardName.trim() || createBoard.isPending || !inspectorId}
            >
              {createBoard.isPending ? 'Creating...' : 'Create Board'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
