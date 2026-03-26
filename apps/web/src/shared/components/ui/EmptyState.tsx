import React from 'react'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-bg-primary rounded-lg border p-12 text-center">
      <div className="w-16 h-16 mx-auto mb-4 text-text-tertiary flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-text-primary mb-2">{title}</h3>
      <p className="text-text-secondary mb-6 max-w-md mx-auto">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-monday-primary text-text-inverse rounded-lg hover:bg-[var(--monday-primary-hover)] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
