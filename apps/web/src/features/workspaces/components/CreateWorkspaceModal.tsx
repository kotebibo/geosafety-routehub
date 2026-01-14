'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { X, Folder, Home, Briefcase, Users, Star, Zap } from 'lucide-react'
import { useCreateWorkspace } from '../hooks/useWorkspaces'
import type { CreateWorkspaceInput } from '@/types/workspace'

interface CreateWorkspaceModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  onSuccess?: (workspaceId: string) => void
}

// Color options
const COLOR_OPTIONS = [
  { value: 'blue', label: 'Blue', class: 'bg-monday-primary' },
  { value: 'green', label: 'Green', class: 'bg-status-done' },
  { value: 'red', label: 'Red', class: 'bg-status-stuck' },
  { value: 'yellow', label: 'Yellow', class: 'bg-status-working' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
]

// Icon options
const ICON_OPTIONS = [
  { value: 'folder', label: 'Folder', Icon: Folder },
  { value: 'home', label: 'Home', Icon: Home },
  { value: 'briefcase', label: 'Work', Icon: Briefcase },
  { value: 'users', label: 'Team', Icon: Users },
  { value: 'star', label: 'Star', Icon: Star },
  { value: 'zap', label: 'Projects', Icon: Zap },
]

export function CreateWorkspaceModal({
  isOpen,
  onClose,
  userId,
  onSuccess,
}: CreateWorkspaceModalProps) {
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [color, setColor] = React.useState('blue')
  const [icon, setIcon] = React.useState('folder')
  const [error, setError] = React.useState<string | null>(null)

  const createMutation = useCreateWorkspace(userId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Workspace name is required')
      return
    }

    try {
      const input: CreateWorkspaceInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        icon,
      }

      const workspace = await createMutation.mutateAsync(input)

      // Reset form
      setName('')
      setDescription('')
      setColor('blue')
      setIcon('folder')

      onSuccess?.(workspace.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace')
    }
  }

  const handleClose = () => {
    setName('')
    setDescription('')
    setColor('blue')
    setIcon('folder')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-text-primary">
            Create Workspace
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-text-tertiary" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Name Input */}
          <div>
            <label htmlFor="workspace-name" className="block text-sm font-medium text-text-primary mb-1.5">
              Workspace Name *
            </label>
            <input
              id="workspace-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Marketing, Engineering, HR"
              className={cn(
                'w-full px-3 py-2 border rounded-lg text-sm transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-monday-primary/20 focus:border-monday-primary',
                'placeholder:text-text-tertiary',
                error && !name.trim() ? 'border-red-300' : 'border-gray-200'
              )}
              autoFocus
            />
          </div>

          {/* Description Input */}
          <div>
            <label htmlFor="workspace-description" className="block text-sm font-medium text-text-primary mb-1.5">
              Description
            </label>
            <textarea
              id="workspace-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this workspace for?"
              rows={3}
              className={cn(
                'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm transition-colors resize-none',
                'focus:outline-none focus:ring-2 focus:ring-monday-primary/20 focus:border-monday-primary',
                'placeholder:text-text-tertiary'
              )}
            />
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Icon
            </label>
            <div className="flex gap-2 flex-wrap">
              {ICON_OPTIONS.map((option) => {
                const IconComponent = option.Icon
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setIcon(option.value)}
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
                      icon === option.value
                        ? 'bg-monday-primary text-white ring-2 ring-offset-2 ring-monday-primary'
                        : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                    )}
                    title={option.label}
                  >
                    <IconComponent className="w-5 h-5" />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setColor(option.value)}
                  className={cn(
                    'w-8 h-8 rounded-full transition-transform hover:scale-110',
                    option.class,
                    color === option.value && 'ring-2 ring-offset-2 ring-monday-primary'
                  )}
                  title={option.label}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Preview
            </label>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg font-semibold',
                  COLOR_OPTIONS.find((c) => c.value === color)?.class || 'bg-monday-primary'
                )}
              >
                {name.trim() ? name.trim().charAt(0).toUpperCase() : 'W'}
              </div>
              <div>
                <div className="font-medium text-text-primary">
                  {name.trim() || 'Workspace Name'}
                </div>
                <div className="text-sm text-text-tertiary">
                  {description.trim() || 'No description'}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-text-primary hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !name.trim()}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors',
                'bg-monday-primary hover:bg-monday-primary-hover',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
