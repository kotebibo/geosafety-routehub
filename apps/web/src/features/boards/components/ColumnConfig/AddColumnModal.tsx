'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { X, Type, Hash, Calendar, CheckSquare, User, MapPin, Building2, Shield, Check, Phone, Paperclip, MessageSquare, Navigation, AlertCircle } from 'lucide-react'
import type { ColumnType, BoardColumn } from '@/types/board'

interface AddColumnModalProps {
  onClose: () => void
  onAdd: (column: { 
    column_name: string
    column_type: ColumnType
    width: number
    config?: Record<string, any>
  }) => void
  existingColumns?: BoardColumn[]  // For linking company_address to company column
}

const COLUMN_TYPES: Array<{
  type: ColumnType
  label: string
  labelKa: string
  icon: React.ReactNode
  description: string
  descriptionKa: string
}> = [
  {
    type: 'text',
    label: 'Text',
    labelKa: 'ტექსტი',
    icon: <Type className="w-5 h-5" />,
    description: 'Single or multi-line text',
    descriptionKa: 'ერთ ან მრავალხაზიანი ტექსტი',
  },
  {
    type: 'number',
    label: 'Number',
    labelKa: 'რიცხვი',
    icon: <Hash className="w-5 h-5" />,
    description: 'Numeric values',
    descriptionKa: 'რიცხვითი მნიშვნელობები',
  },
  {
    type: 'status',
    label: 'Status',
    labelKa: 'სტატუსი',
    icon: <CheckSquare className="w-5 h-5" />,
    description: 'Colored status labels',
    descriptionKa: 'ფერადი სტატუსის ლეიბლები',
  },
  {
    type: 'date',
    label: 'Date',
    labelKa: 'თარიღი',
    icon: <Calendar className="w-5 h-5" />,
    description: 'Date picker',
    descriptionKa: 'თარიღის არჩევა',
  },
  {
    type: 'date_range',
    label: 'Date Range',
    labelKa: 'თარიღის დიაპაზონი',
    icon: <Calendar className="w-5 h-5" />,
    description: 'Start and end date',
    descriptionKa: 'საწყისი და საბოლოო თარიღი',
  },
  {
    type: 'person',
    label: 'Person',
    labelKa: 'პიროვნება',
    icon: <User className="w-5 h-5" />,
    description: 'Assign people',
    descriptionKa: 'პიროვნების მინიჭება',
  },
  {
    type: 'route',
    label: 'Route',
    labelKa: 'მარშრუტი',
    icon: <MapPin className="w-5 h-5" />,
    description: 'Link to a route',
    descriptionKa: 'მარშრუტთან დაკავშირება',
  },
  {
    type: 'company',
    label: 'Company',
    labelKa: 'კომპანია',
    icon: <Building2 className="w-5 h-5" />,
    description: 'Link to a company',
    descriptionKa: 'კომპანიასთან დაკავშირება',
  },
  {
    type: 'company_address',
    label: 'Company Address',
    labelKa: 'კომპანიის მისამართი',
    icon: <Navigation className="w-5 h-5" />,
    description: 'Auto-display company location address',
    descriptionKa: 'კომპანიის ლოკაციის მისამართის ავტომატური ჩვენება',
  },
  {
    type: 'service_type',
    label: 'Service Type',
    labelKa: 'სერვისის ტიპი',
    icon: <Shield className="w-5 h-5" />,
    description: 'Select inspection service',
    descriptionKa: 'ინსპექტირების სერვისის არჩევა',
  },
  {
    type: 'checkbox',
    label: 'Checkbox',
    labelKa: 'ჩექბოქსი',
    icon: <Check className="w-5 h-5" />,
    description: 'Yes/No toggle',
    descriptionKa: 'დიახ/არა გადამრთველი',
  },
  {
    type: 'phone',
    label: 'Phone',
    labelKa: 'ტელეფონი',
    icon: <Phone className="w-5 h-5" />,
    description: 'Click-to-call phone number',
    descriptionKa: 'დასარეკი ტელეფონის ნომერი',
  },
  {
    type: 'files',
    label: 'Files',
    labelKa: 'ფაილები',
    icon: <Paperclip className="w-5 h-5" />,
    description: 'Attach photos and documents',
    descriptionKa: 'ფოტოების და დოკუმენტების მიმაგრება',
  },
  {
    type: 'updates',
    label: 'Updates',
    labelKa: 'განახლებები',
    icon: <MessageSquare className="w-5 h-5" />,
    description: 'Comments and activity log',
    descriptionKa: 'კომენტარები და აქტივობის ჟურნალი',
  },
]

export function AddColumnModal({ onClose, onAdd, existingColumns = [] }: AddColumnModalProps) {
  const [columnName, setColumnName] = useState('')
  const [selectedType, setSelectedType] = useState<ColumnType>('text')
  const [width, setWidth] = useState(180)
  const [linkedCompanyColumnId, setLinkedCompanyColumnId] = useState<string>('')

  // Get existing company columns for linking
  const companyColumns = existingColumns.filter(col => col.column_type === 'company')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!columnName.trim()) return

    // Validate company_address requires a linked company column
    if (selectedType === 'company_address' && !linkedCompanyColumnId && companyColumns.length > 0) {
      alert('გთხოვთ აირჩიოთ კომპანიის სვეტი')
      return
    }

    const config: Record<string, any> = {}
    
    // Add linked column config for company_address
    if (selectedType === 'company_address' && linkedCompanyColumnId) {
      config.linked_company_column_id = linkedCompanyColumnId
    }

    onAdd({
      column_name: columnName.trim(),
      column_type: selectedType,
      width,
      config: Object.keys(config).length > 0 ? config : undefined,
    })
    onClose()
  }

  // Auto-select first company column when company_address is selected
  React.useEffect(() => {
    if (selectedType === 'company_address' && companyColumns.length > 0 && !linkedCompanyColumnId) {
      setLinkedCompanyColumnId(companyColumns[0].id)
    }
  }, [selectedType, companyColumns, linkedCompanyColumnId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-bg-primary rounded-lg shadow-2xl w-full max-w-3xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <h2 className="text-lg font-semibold text-text-primary">სვეტის დამატება</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-bg-hover transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
          {/* Column Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-2">
              სვეტის სახელი
            </label>
            <input
              type="text"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              placeholder="მაგ: პრიორიტეტი, მფლობელი, ვადა"
              className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:border-monday-primary"
              autoFocus
            />
          </div>

          {/* Column Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-3">
              სვეტის ტიპი
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {COLUMN_TYPES.map((type) => (
                <button
                  key={type.type}
                  type="button"
                  onClick={() => setSelectedType(type.type)}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border-2 transition-all',
                    'hover:border-monday-primary/50',
                    selectedType === type.type
                      ? 'border-monday-primary bg-blue-50'
                      : 'border-border-light bg-bg-secondary'
                  )}
                >
                  <div
                    className={cn(
                      'flex-shrink-0 mt-0.5',
                      selectedType === type.type
                        ? 'text-monday-primary'
                        : 'text-text-tertiary'
                    )}
                  >
                    {type.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div
                      className={cn(
                        'font-medium mb-0.5',
                        selectedType === type.type
                          ? 'text-monday-primary'
                          : 'text-text-primary'
                      )}
                    >
                      {type.labelKa}
                    </div>
                    <div className="text-xs text-text-tertiary">
                      {type.descriptionKa}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Company Address Configuration */}
          {selectedType === 'company_address' && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label className="block text-sm font-medium text-text-primary mb-2">
                დაკავშირებული კომპანიის სვეტი
              </label>
              {companyColumns.length === 0 ? (
                <div className="flex items-start gap-2 text-amber-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">კომპანიის სვეტი არ მოიძებნა</p>
                    <p className="text-xs mt-1">
                      ჯერ დაამატეთ "კომპანია" ტიპის სვეტი, შემდეგ შეძლებთ მისამართის სვეტის დამატებას.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <select
                    value={linkedCompanyColumnId}
                    onChange={(e) => setLinkedCompanyColumnId(e.target.value)}
                    className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:border-monday-primary"
                  >
                    {companyColumns.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.column_name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600 mt-2">
                    მისამართი ავტომატურად გამოჩნდება არჩეული კომპანიის ლოკაციიდან
                  </p>
                </>
              )}
            </div>
          )}

          {/* Column Width */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-2">
              სვეტის სიგანე: {width}px
            </label>
            <input
              type="range"
              min="80"
              max="500"
              step="10"
              value={width}
              onChange={(e) => setWidth(parseInt(e.target.value))}
              className="w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #0073ea 0%, #0073ea ${((width - 80) / (500 - 80)) * 100}%, #e6e9ef ${((width - 80) / (500 - 80)) * 100}%, #e6e9ef 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-text-tertiary mt-1">
              <span>80px (ვიწრო)</span>
              <span>500px (ფართო)</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-light">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:bg-bg-hover rounded-md transition-colors"
            >
              გაუქმება
            </button>
            <button
              type="submit"
              disabled={!columnName.trim() || (selectedType === 'company_address' && companyColumns.length === 0)}
              className={cn(
                'px-4 py-2 bg-monday-primary text-white rounded-md transition-colors',
                columnName.trim() && !(selectedType === 'company_address' && companyColumns.length === 0)
                  ? 'hover:bg-monday-primary-hover'
                  : 'opacity-50 cursor-not-allowed'
              )}
            >
              სვეტის დამატება
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
