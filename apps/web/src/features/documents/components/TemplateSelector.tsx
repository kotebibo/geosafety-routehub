'use client'

import { FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DocumentTemplate } from '../types/document'

interface TemplateSelectorProps {
  templates: DocumentTemplate[]
  loading: boolean
  selectedId: string | null
  onSelect: (templateId: string) => void
}

export function TemplateSelector({
  templates,
  loading,
  selectedId,
  onSelect,
}: TemplateSelectorProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-text-tertiary" />
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="w-12 h-12 text-text-tertiary mb-3" />
        <p className="text-text-secondary font-medium">No templates available</p>
        <p className="text-sm text-text-tertiary mt-1 max-w-sm">
          An admin needs to upload document templates first. Go to the board menu, open &quot;Manage
          Templates&quot;, and upload a .docx file with {'{{tag}}'} placeholders.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {templates.map(template => (
        <button
          key={template.id}
          onClick={() => onSelect(template.id)}
          className={cn(
            'w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
            selectedId === template.id
              ? 'border-monday-primary bg-monday-primary/5 ring-2 ring-monday-primary'
              : 'border-border-light hover:border-border-default hover:bg-bg-hover'
          )}
        >
          <div
            className={cn(
              'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
              selectedId === template.id ? 'bg-monday-primary/10' : 'bg-bg-secondary'
            )}
          >
            <FileText
              className={cn(
                'w-5 h-5',
                selectedId === template.id ? 'text-monday-primary' : 'text-text-tertiary'
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-text-primary truncate">{template.name}</p>
            {template.description && (
              <p className="text-sm text-text-secondary mt-0.5 line-clamp-2">
                {template.description}
              </p>
            )}
            <p className="text-xs text-text-tertiary mt-1">
              {template.tags.length} merge tags &middot; {template.file_name}
            </p>
          </div>
        </button>
      ))}
    </div>
  )
}
