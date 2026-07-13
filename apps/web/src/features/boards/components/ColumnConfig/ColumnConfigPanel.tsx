'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { X, Eye, EyeOff, GripVertical, Plus, Trash2, Settings as SettingsIcon } from 'lucide-react'
import { Tooltip } from '@/shared/components/ui/tooltip'
import {
  CHECKIN_SERVICES,
  CUSTOM_SERVICE,
  buildStageOptionsFromTypes,
  getCheckinTypes,
  getEffectiveVisitTypes,
} from '@/features/boards/constants/checkin'
import type { BoardColumn } from '@/types/board'

function ServiceSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [customMode, setCustomMode] = useState(false)
  const [draft, setDraft] = useState('')
  const isPredefined = (CHECKIN_SERVICES as readonly string[]).includes(value)

  if (customMode) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => {
          setCustomMode(false)
          if (draft.trim()) onChange(draft.trim())
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            ;(e.target as HTMLInputElement).blur()
          }
        }}
        placeholder="ჩაწერეთ სერვისის სახელი"
        className="w-full px-2 py-1.5 text-sm bg-bg-primary text-text-primary border border-border-light rounded-md focus:outline-none focus:border-monday-primary"
      />
    )
  }

  return (
    <select
      value={value}
      onChange={e => {
        if (e.target.value === CUSTOM_SERVICE) {
          setDraft(!isPredefined ? value : '')
          setCustomMode(true)
        } else {
          onChange(e.target.value)
        }
      }}
      className="w-full px-2 py-1.5 text-sm bg-bg-primary text-text-primary border border-border-light rounded-md focus:outline-none focus:border-monday-primary"
    >
      <option value="">არ არის მითითებული</option>
      {CHECKIN_SERVICES.map(s => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
      {value && !isPredefined && <option value={value}>{value}</option>}
      <option value={CUSTOM_SERVICE}>სხვა...</option>
    </select>
  )
}

interface VisitTypesEditorProps {
  config: Record<string, any>
  // null = revert to the service defaults
  onSave: (types: string[] | null) => void
}

function VisitTypesEditor({ config, onSave }: VisitTypesEditorProps) {
  const [draft, setDraft] = useState('')
  const types = getEffectiveVisitTypes(config)
  const isCustomized = Array.isArray(config.visit_types) && config.visit_types.length > 0
  const hasDefaults = getCheckinTypes(config.service).length > 0

  const addType = () => {
    const value = draft.trim()
    if (!value || types.includes(value)) return
    onSave([...types, value])
    setDraft('')
  }

  const removeType = (t: string) => {
    const next = types.filter(x => x !== t)
    // Removing the last type reverts to defaults rather than leaving an
    // empty list (an empty custom list would disable the dropdown entirely)
    onSave(next.length > 0 ? next : null)
  }

  if (!hasDefaults && types.length === 0) {
    return (
      <p className="text-xs text-text-tertiary">
        ამ სერვისს ნაგულისხმევი ტიპები არ აქვს — დაამატეთ ქვემოთ, ან ჯერ აირჩიეთ სერვისი.
      </p>
    )
  }

  return (
    <div className="space-y-1.5">
      <ul className="space-y-1">
        {types.map(t => (
          <li
            key={t}
            className="group flex items-start justify-between gap-2 px-2 py-1.5 rounded-md bg-bg-primary border border-border-light text-xs text-text-primary leading-snug"
          >
            <span className="min-w-0 break-words">{t}</span>
            <button
              type="button"
              title="წაშლა"
              onClick={() => removeType(t)}
              className="flex-shrink-0 p-0.5 rounded hover:bg-red-500/10 md:opacity-0 md:group-hover:opacity-100 transition-all"
            >
              <X className="w-3.5 h-3.5 text-red-500" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addType()
            }
          }}
          placeholder="ახალი ტიპი..."
          className="flex-1 min-w-0 px-2 py-1.5 text-xs bg-bg-primary text-text-primary border border-border-light rounded-md focus:outline-none focus:border-monday-primary"
        />
        <button
          type="button"
          onClick={addType}
          disabled={!draft.trim()}
          className="flex-shrink-0 px-2 py-1.5 rounded-md bg-monday-primary text-white disabled:opacity-40 hover:bg-monday-primary-hover transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      {isCustomized && hasDefaults && (
        <button
          type="button"
          onClick={() => onSave(null)}
          className="text-xs text-text-tertiary hover:text-monday-primary transition-colors"
        >
          ↺ ნაგულისხმევ ტიპებზე დაბრუნება
        </button>
      )}
    </div>
  )
}

interface ColumnConfigPanelProps {
  columns: BoardColumn[]
  onClose: () => void
  onUpdateColumn: (columnId: string, updates: Partial<BoardColumn>) => void
  onReorderColumns: (columns: BoardColumn[]) => void
  onAddColumn: () => void
  onDeleteColumn: (columnId: string) => void
}

export function ColumnConfigPanel({
  columns,
  onClose,
  onUpdateColumn,
  onReorderColumns,
  onAddColumn,
  onDeleteColumn,
}: ColumnConfigPanelProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newColumns = [...columns]
    const draggedColumn = newColumns[draggedIndex]
    newColumns.splice(draggedIndex, 1)
    newColumns.splice(index, 0, draggedColumn)

    onReorderColumns(newColumns)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const toggleVisibility = (column: BoardColumn) => {
    onUpdateColumn(column.id, { is_visible: !column.is_visible })
  }

  const handleWidthChange = (column: BoardColumn, newWidth: number) => {
    onUpdateColumn(column.id, { width: Math.max(80, Math.min(500, newWidth)) })
  }

  // Candidate columns that could hold coordinates for a checkin column's geofence
  const coordsCandidateColumns = columns.filter(
    col =>
      col.column_type !== 'checkin' &&
      col.column_type !== 'actions' &&
      col.column_type !== 'updates' &&
      col.column_type !== 'files'
  )

  const handleConfigChange = (
    column: BoardColumn,
    key: string,
    value: string | string[] | null
  ) => {
    onUpdateColumn(column.id, {
      config: {
        ...((column.config as Record<string, any>) || {}),
        [key]: value && (!Array.isArray(value) || value.length > 0) ? value : null,
      },
    } as Partial<BoardColumn>)
  }

  // Overwrite the linked status column's options with the full stage list
  // (custom visit types when provided, else the service defaults), so all
  // stages are visible immediately after linking
  const seedStageOptions = (
    service: string | null | undefined,
    stageColumnId: string | null,
    explicitTypes?: string[]
  ) => {
    if (!stageColumnId) return
    const types =
      explicitTypes && explicitTypes.length > 0 ? explicitTypes : getCheckinTypes(service)
    const options = buildStageOptionsFromTypes(types)
    if (options.length === 0) return
    const statusCol = columns.find(c => c.column_id === stageColumnId && c.column_type === 'status')
    if (statusCol) {
      onUpdateColumn(statusCol.id, {
        config: { ...((statusCol.config as Record<string, any>) || {}), options },
      } as Partial<BoardColumn>)
    }
  }

  const getColumnTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      text: 'Text',
      number: 'Number',
      status: 'Status',
      date: 'Date',
      person: 'Person',
      checkbox: 'Checkbox',
      dropdown: 'Dropdown',
      link: 'Link',
      checkin: 'Check-in',
    }
    return typeMap[type] || type
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-[400px] bg-bg-primary shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-monday-primary" />
            <h2 className="text-lg font-semibold text-text-primary">Column Settings</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-bg-hover transition-colors">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Column List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {columns.map((column, index) => (
              <div
                key={column.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={e => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'bg-bg-secondary rounded-lg border border-border-light p-3',
                  'transition-all duration-200',
                  draggedIndex === index && 'opacity-50 scale-95',
                  'hover:border-monday-primary hover:shadow-sm'
                )}
              >
                <div className="flex items-center gap-2">
                  {/* Drag Handle */}
                  <button className="cursor-grab active:cursor-grabbing text-text-tertiary hover:text-text-primary">
                    <GripVertical className="w-4 h-4" />
                  </button>

                  {/* Column Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-text-primary truncate">
                        {column.column_name}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-bg-tertiary text-text-tertiary">
                        {getColumnTypeLabel(column.column_type)}
                      </span>
                    </div>

                    {/* Width Control */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-tertiary">Width:</span>
                      <input
                        type="range"
                        min="80"
                        max="500"
                        step="10"
                        value={column.width}
                        onChange={e => handleWidthChange(column, parseInt(e.target.value))}
                        className="flex-1 h-1 bg-bg-tertiary rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, var(--monday-primary) 0%, var(--monday-primary) ${((column.width - 80) / (500 - 80)) * 100}%, var(--border-light) ${((column.width - 80) / (500 - 80)) * 100}%, var(--border-light) 100%)`,
                        }}
                      />
                      <span className="text-xs text-text-secondary w-10 text-right">
                        {column.width}px
                      </span>
                    </div>

                    {/* Checkin: coordinates source column + service */}
                    {column.column_type === 'checkin' && (
                      <div className="mt-2 pt-2 border-t border-border-light space-y-2">
                        <div>
                          <label className="block text-xs text-text-tertiary mb-1">
                            კოორდინატების სვეტი (გეოფენსი)
                          </label>
                          <select
                            value={
                              (column.config as Record<string, any>)?.coordinates_column_id || ''
                            }
                            onChange={e =>
                              handleConfigChange(column, 'coordinates_column_id', e.target.value)
                            }
                            className="w-full px-2 py-1.5 text-sm bg-bg-primary text-text-primary border border-border-light rounded-md focus:outline-none focus:border-monday-primary"
                          >
                            <option value="">GPS-ის რეჟიმი (გეოფენსის გარეშე)</option>
                            {coordsCandidateColumns.map(col => (
                              <option key={col.id} value={col.column_id}>
                                {col.column_name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-text-tertiary mb-1">სერვისი</label>
                          <ServiceSelect
                            value={(column.config as Record<string, any>)?.service || ''}
                            onChange={value => {
                              handleConfigChange(column, 'service', value)
                              seedStageOptions(
                                value,
                                (column.config as Record<string, any>)?.stage_column_id || null
                              )
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-text-tertiary mb-1">
                            სტადიის სვეტი (ავტო-განახლება)
                          </label>
                          <select
                            value={(column.config as Record<string, any>)?.stage_column_id || ''}
                            onChange={e => {
                              handleConfigChange(column, 'stage_column_id', e.target.value)
                              seedStageOptions(
                                (column.config as Record<string, any>)?.service,
                                e.target.value || null
                              )
                            }}
                            className="w-full px-2 py-1.5 text-sm bg-bg-primary text-text-primary border border-border-light rounded-md focus:outline-none focus:border-monday-primary"
                          >
                            <option value="">გამორთული</option>
                            {columns
                              .filter(col => col.column_type === 'status')
                              .map(col => (
                                <option key={col.id} value={col.column_id}>
                                  {col.column_name}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-text-tertiary mb-1">
                            ვიზიტის ტიპები
                          </label>
                          <VisitTypesEditor
                            config={(column.config as Record<string, any>) || {}}
                            onSave={types => {
                              handleConfigChange(column, 'visit_types', types)
                              seedStageOptions(
                                (column.config as Record<string, any>)?.service,
                                (column.config as Record<string, any>)?.stage_column_id || null,
                                types || undefined
                              )
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Tooltip
                      content={column.is_visible ? 'Hide column' : 'Show column'}
                      side="top"
                      delayDuration={200}
                    >
                      <button
                        onClick={() => toggleVisibility(column)}
                        className="p-1.5 rounded hover:bg-bg-hover transition-colors"
                      >
                        {column.is_visible ? (
                          <Eye className="w-4 h-4 text-monday-primary" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-text-tertiary" />
                        )}
                      </button>
                    </Tooltip>
                    <Tooltip content="Delete column" side="top" delayDuration={200}>
                      <button
                        onClick={() => {
                          if (confirm(`Delete column "${column.column_name}"?`)) {
                            onDeleteColumn(column.id)
                          }
                        }}
                        className="p-1.5 rounded hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-light">
          <button
            onClick={onAddColumn}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-monday-primary text-white rounded-md hover:bg-monday-primary-hover transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Add Column</span>
          </button>
        </div>
      </div>
    </div>
  )
}
