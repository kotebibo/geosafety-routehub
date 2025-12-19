'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { X, FileCheck } from 'lucide-react'
import { Button } from '@/components/ui-monday'
import { useSaveAsTemplate } from '../hooks'

interface SaveAsTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  boardId: string
  boardName: string
  onSuccess?: () => void
}

const CATEGORY_OPTIONS = [
  { value: 'project', label: 'Project Management' },
  { value: 'crm', label: 'CRM & Sales' },
  { value: 'hr', label: 'HR & Recruiting' },
  { value: 'operations', label: 'Operations' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'other', label: 'Other' },
]

export function SaveAsTemplateModal({
  isOpen,
  onClose,
  boardId,
  boardName,
  onSuccess,
}: SaveAsTemplateModalProps) {
  const [name, setName] = useState(`${boardName} Template`)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('other')

  const saveAsTemplate = useSaveAsTemplate()

  const handleSave = async () => {
    if (!name.trim()) return

    try {
      await saveAsTemplate.mutateAsync({
        boardId,
        templateData: {
          name: name.trim(),
          description: description.trim() || undefined,
          category,
        },
      })

      onSuccess?.()
      handleClose()
    } catch (error) {
      console.error('Failed to save as template:', error)
    }
  }

  const handleClose = () => {
    setName(`${boardName} Template`)
    setDescription('')
    setCategory('other')
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
      <div className="relative w-full max-w-md bg-bg-primary rounded-lg shadow-monday-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-status-done/10 flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-status-done" />
            </div>
            <h2 className="text-h4 font-semibold text-text-primary">
              Save as Template
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-md hover:bg-bg-hover transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          <p className="text-sm text-text-secondary">
            Save the current board structure as a reusable template. The columns and configuration will be saved, but not the data.
          </p>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Template Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Template"
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
            <label className="block text-sm font-medium text-text-primary mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this template is for..."
              rows={3}
              className={cn(
                'w-full px-4 py-2 rounded-md resize-none',
                'border border-border-default',
                'focus:ring-2 focus:ring-monday-primary focus:border-transparent',
                'text-text-primary placeholder-text-tertiary',
                'transition-all'
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={cn(
                'w-full px-4 py-2 rounded-md',
                'border border-border-default',
                'focus:ring-2 focus:ring-monday-primary focus:border-transparent',
                'text-text-primary bg-white',
                'transition-all'
              )}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-light">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!name.trim() || saveAsTemplate.isPending}
          >
            {saveAsTemplate.isPending ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>
    </div>
  )
}
