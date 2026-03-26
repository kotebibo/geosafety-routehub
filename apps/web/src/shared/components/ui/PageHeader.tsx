import React from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="bg-bg-primary border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
            {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
          </div>
          {action && (
            <button
              onClick={action.onClick}
              className="inline-flex items-center px-4 py-2 bg-monday-primary text-text-inverse rounded-lg hover:bg-[var(--monday-primary-hover)] transition-colors"
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              <span>{action.label}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
