'use client'

import { useState } from 'react'
import { ArrowRight, Save } from 'lucide-react'
import { Button } from '@/shared/components/ui'
import type { DocumentTemplate } from '../types/document'

const COMPUTED_FIELDS = [
  { value: '@computed:current_date', label: 'Current Date (Georgian)' },
  { value: '@computed:current_date_short', label: 'Current Date (Short)' },
  { value: '@computed:current_year', label: 'Current Year' },
  { value: '@computed:current_month', label: 'Current Month' },
]

interface TemplateTagMapperProps {
  template: DocumentTemplate
  columns: Array<{ column_id: string; column_name: string; column_type: string }>
  onSave: (mapping: Record<string, string>) => void
  onCancel: () => void
}

export function TemplateTagMapper({ template, columns, onSave, onCancel }: TemplateTagMapperProps) {
  const [mapping, setMapping] = useState<Record<string, string>>(template.tag_mapping || {})

  const handleChange = (tag: string, value: string) => {
    setMapping(prev => {
      if (!value) {
        const next = { ...prev }
        delete next[tag]
        return next
      }
      return { ...prev, [tag]: value }
    })
  }

  const mappedCount = Object.values(mapping).filter(Boolean).length

  return (
    <div>
      <p className="text-sm text-text-secondary mb-4">
        Map each template tag to a board column or computed value. Tags without mapping will be left
        empty in generated documents.
      </p>

      <div className="border border-border-light rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-2 bg-bg-secondary border-b border-border-light">
          <span className="text-xs font-semibold text-text-secondary uppercase flex-1">
            Template Tag
          </span>
          <span className="text-xs text-text-tertiary">
            <ArrowRight className="w-3 h-3" />
          </span>
          <span className="text-xs font-semibold text-text-secondary uppercase flex-1">
            Maps To
          </span>
        </div>

        {/* Rows */}
        {template.tags.map(tag => (
          <div
            key={tag}
            className="flex items-center gap-4 px-4 py-2.5 border-b border-border-light last:border-b-0 hover:bg-bg-hover"
          >
            <code className="flex-1 text-sm text-monday-primary bg-monday-primary/5 px-2 py-1 rounded font-mono">
              {`{{${tag}}}`}
            </code>
            <ArrowRight className="w-3 h-3 text-text-tertiary flex-shrink-0" />
            <select
              value={mapping[tag] || ''}
              onChange={e => handleChange(tag, e.target.value)}
              className="flex-1 text-sm px-2 py-1.5 border border-border-default rounded-md focus:ring-2 focus:ring-monday-primary focus:border-transparent bg-bg-primary text-text-primary"
            >
              <option value="">-- Not mapped --</option>
              <optgroup label="Item Fields">
                <option value="name">Item Name</option>
              </optgroup>
              <optgroup label="Board Columns">
                {columns
                  .filter(c => !['files', 'updates', 'actions'].includes(c.column_type))
                  .map(col => (
                    <option key={col.column_id} value={col.column_id}>
                      {col.column_name} ({col.column_type})
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Computed Values">
                {COMPUTED_FIELDS.map(cf => (
                  <option key={cf.value} value={cf.value}>
                    {cf.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-text-tertiary">
          {mappedCount} of {template.tags.length} tags mapped
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={() => onSave(mapping)}>
            <Save className="w-4 h-4 mr-1" />
            Save Mapping
          </Button>
        </div>
      </div>
    </div>
  )
}
