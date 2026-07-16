'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui-monday/Toast'
import {
  X,
  Type,
  Hash,
  Calendar,
  CheckSquare,
  User,
  MapPin,
  Building2,
  Shield,
  Check,
  Phone,
  Mail,
  Paperclip,
  MessageSquare,
  Navigation,
  AlertCircle,
  ClipboardCheck,
} from 'lucide-react'
import { CHECKIN_SERVICES, CUSTOM_SERVICE } from '@/features/boards/constants/checkin'

import type { ColumnType, BoardColumn } from '@/types/board'

interface AddColumnModalProps {
  onClose: () => void
  onAdd: (column: {
    column_name: string
    column_type: ColumnType
    width: number
    config?: Record<string, any>
  }) => void
  existingColumns?: BoardColumn[] // For linking company_address to company column
}

const COLUMN_TYPES: Array<{
  type: ColumnType
  labelKey: string
  icon: React.ReactNode
  descriptionKey: string
}> = [
  {
    type: 'text',
    labelKey: 'boards.addColumnModal.types.text.label',
    icon: <Type className="w-5 h-5" />,
    descriptionKey: 'boards.addColumnModal.types.text.description',
  },
  {
    type: 'number',
    labelKey: 'boards.addColumnModal.types.number.label',
    icon: <Hash className="w-5 h-5" />,
    descriptionKey: 'boards.addColumnModal.types.number.description',
  },
  {
    type: 'status',
    labelKey: 'boards.addColumnModal.types.status.label',
    icon: <CheckSquare className="w-5 h-5" />,
    descriptionKey: 'boards.addColumnModal.types.status.description',
  },
  {
    type: 'date',
    labelKey: 'boards.addColumnModal.types.date.label',
    icon: <Calendar className="w-5 h-5" />,
    descriptionKey: 'boards.addColumnModal.types.date.description',
  },
  {
    type: 'date_range',
    labelKey: 'boards.addColumnModal.types.dateRange.label',
    icon: <Calendar className="w-5 h-5" />,
    descriptionKey: 'boards.addColumnModal.types.dateRange.description',
  },
  {
    type: 'person',
    labelKey: 'boards.addColumnModal.types.person.label',
    icon: <User className="w-5 h-5" />,
    descriptionKey: 'boards.addColumnModal.types.person.description',
  },
  {
    type: 'route',
    labelKey: 'boards.addColumnModal.types.route.label',
    icon: <MapPin className="w-5 h-5" />,
    descriptionKey: 'boards.addColumnModal.types.route.description',
  },
  {
    type: 'company',
    labelKey: 'boards.addColumnModal.types.company.label',
    icon: <Building2 className="w-5 h-5" />,
    descriptionKey: 'boards.addColumnModal.types.company.description',
  },
  {
    type: 'company_address',
    labelKey: 'boards.addColumnModal.types.companyAddress.label',
    icon: <Navigation className="w-5 h-5" />,
    descriptionKey: 'boards.addColumnModal.types.companyAddress.description',
  },
  {
    type: 'service_type',
    labelKey: 'boards.addColumnModal.types.serviceType.label',
    icon: <Shield className="w-5 h-5" />,
    descriptionKey: 'boards.addColumnModal.types.serviceType.description',
  },
  {
    type: 'checkbox',
    labelKey: 'boards.addColumnModal.types.checkbox.label',
    icon: <Check className="w-5 h-5" />,
    descriptionKey: 'boards.addColumnModal.types.checkbox.description',
  },
  {
    type: 'phone',
    labelKey: 'boards.addColumnModal.types.phone.label',
    icon: <Phone className="w-5 h-5" />,
    descriptionKey: 'boards.addColumnModal.types.phone.description',
  },
  {
    type: 'email',
    labelKey: 'boards.addColumnModal.types.email.label',
    icon: <Mail className="w-5 h-5" />,
    descriptionKey: 'boards.addColumnModal.types.email.description',
  },
  {
    type: 'files',
    labelKey: 'boards.addColumnModal.types.files.label',
    icon: <Paperclip className="w-5 h-5" />,
    descriptionKey: 'boards.addColumnModal.types.files.description',
  },
  {
    type: 'updates',
    labelKey: 'boards.addColumnModal.types.updates.label',
    icon: <MessageSquare className="w-5 h-5" />,
    descriptionKey: 'boards.addColumnModal.types.updates.description',
  },
  {
    type: 'checkin',
    labelKey: 'boards.addColumnModal.types.checkin.label',
    icon: <ClipboardCheck className="w-5 h-5" />,
    descriptionKey: 'boards.addColumnModal.types.checkin.description',
  },
]

export function AddColumnModal({ onClose, onAdd, existingColumns = [] }: AddColumnModalProps) {
  const t = useTranslations()
  const { showToast } = useToast()
  const [columnName, setColumnName] = useState('')
  const [selectedType, setSelectedType] = useState<ColumnType>('text')
  const [width, setWidth] = useState(180)
  const [linkedCompanyColumnId, setLinkedCompanyColumnId] = useState<string>('')
  const [coordinatesColumnId, setCoordinatesColumnId] = useState<string>('')
  const [service, setService] = useState<string>('')
  const [customService, setCustomService] = useState<string>('')
  const [stageColumnId, setStageColumnId] = useState<string>('')
  const [nameBlurred, setNameBlurred] = useState(false)

  // Get existing company columns for linking
  const companyColumns = existingColumns.filter(col => col.column_type === 'company')

  // Get candidate columns for coordinates (any column that could hold lat/lng)
  const coordsCandidateColumns = existingColumns.filter(
    col =>
      col.column_type !== 'checkin' &&
      col.column_type !== 'actions' &&
      col.column_type !== 'updates' &&
      col.column_type !== 'files'
  )

  // Status columns eligible as auto-updated stage targets
  const statusColumns = existingColumns.filter(col => col.column_type === 'status')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!columnName.trim()) return

    // Validate company_address requires a linked company column
    if (selectedType === 'company_address' && !linkedCompanyColumnId && companyColumns.length > 0) {
      showToast(t('boards.addColumnModal.selectCompanyColumnWarning'), 'warning')
      return
    }

    const config: Record<string, any> = {}

    // Add linked column config for company_address
    if (selectedType === 'company_address' && linkedCompanyColumnId) {
      config.linked_company_column_id = linkedCompanyColumnId
    }

    // Add coordinates column config for checkin
    if (selectedType === 'checkin' && coordinatesColumnId) {
      config.coordinates_column_id = coordinatesColumnId
    }

    // Add service config for checkin
    if (selectedType === 'checkin') {
      const resolvedService = service === CUSTOM_SERVICE ? customService.trim() : service
      if (resolvedService) config.service = resolvedService
      if (stageColumnId) config.stage_column_id = stageColumnId
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-bg-primary rounded-lg shadow-2xl w-full max-w-3xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <h2 className="text-lg font-semibold text-text-primary">
            {t('boards.addColumnModal.title')}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-bg-hover transition-colors">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
          {/* Column Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-2">
              {t('boards.addColumnModal.nameLabel')}
            </label>
            <input
              type="text"
              value={columnName}
              onChange={e => setColumnName(e.target.value)}
              onBlur={() => setNameBlurred(true)}
              placeholder={t('boards.addColumnModal.namePlaceholder')}
              className={cn(
                'w-full px-3 py-2 bg-bg-primary text-text-primary border rounded-md placeholder:text-text-tertiary focus:outline-none focus:border-monday-primary',
                nameBlurred && !columnName.trim()
                  ? 'border-red-400 bg-red-500/10'
                  : 'border-border-light'
              )}
              autoFocus
            />
            {nameBlurred && !columnName.trim() && (
              <p className="text-xs text-red-500 mt-1">{t('boards.addColumnModal.nameRequired')}</p>
            )}
          </div>

          {/* Column Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-3">
              {t('boards.addColumnModal.typeLabel')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {COLUMN_TYPES.map(type => (
                <button
                  key={type.type}
                  type="button"
                  onClick={() => setSelectedType(type.type)}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border-2 transition-all',
                    'hover:border-monday-primary/50',
                    selectedType === type.type
                      ? 'border-monday-primary bg-blue-500/10'
                      : 'border-border-light bg-bg-secondary'
                  )}
                >
                  <div
                    className={cn(
                      'flex-shrink-0 mt-0.5',
                      selectedType === type.type ? 'text-monday-primary' : 'text-text-tertiary'
                    )}
                  >
                    {type.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div
                      className={cn(
                        'font-medium mb-0.5',
                        selectedType === type.type ? 'text-monday-primary' : 'text-text-primary'
                      )}
                    >
                      {t(type.labelKey)}
                    </div>
                    <div className="text-xs text-text-tertiary">{t(type.descriptionKey)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Company Address Configuration */}
          {selectedType === 'company_address' && (
            <div className="mb-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <label className="block text-sm font-medium text-text-primary mb-2">
                {t('boards.addColumnModal.companyAddress.linkedColumnLabel')}
              </label>
              {companyColumns.length === 0 ? (
                <div className="flex items-start gap-2 text-amber-500">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">
                      {t('boards.addColumnModal.companyAddress.noCompanyColumnFound')}
                    </p>
                    <p className="text-xs mt-1">
                      {t('boards.addColumnModal.companyAddress.addCompanyColumnFirst')}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <select
                    value={linkedCompanyColumnId}
                    onChange={e => setLinkedCompanyColumnId(e.target.value)}
                    className="w-full px-3 py-2 bg-bg-primary text-text-primary border border-border-light rounded-md focus:outline-none focus:border-monday-primary"
                  >
                    {companyColumns.map(col => (
                      <option key={col.id} value={col.id}>
                        {col.column_name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-text-secondary mt-2">
                    {t('boards.addColumnModal.companyAddress.autoFillHint')}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Checkin Coordinates Configuration */}
          {selectedType === 'checkin' && (
            <div className="mb-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <label className="block text-sm font-medium text-text-primary mb-2">
                {t('boards.addColumnModal.checkin.coordinatesColumnLabel')}
              </label>
              {coordsCandidateColumns.length === 0 ? (
                <div className="flex items-start gap-2 text-blue-500">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">
                    {t('boards.addColumnModal.checkin.noCoordinatesColumn')}
                  </p>
                </div>
              ) : (
                <>
                  <select
                    value={coordinatesColumnId}
                    onChange={e => setCoordinatesColumnId(e.target.value)}
                    className="w-full px-3 py-2 bg-bg-primary text-text-primary border border-border-light rounded-md focus:outline-none focus:border-monday-primary"
                  >
                    <option value="">{t('boards.addColumnModal.checkin.gpsModeOption')}</option>
                    {/* value must be column_id (the item.data key), not the row UUID */}
                    {coordsCandidateColumns.map(col => (
                      <option key={col.id} value={col.column_id}>
                        {col.column_name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-text-secondary mt-2">
                    {t('boards.addColumnModal.checkin.coordinatesColumnHint')}
                  </p>
                </>
              )}

              <label className="block text-sm font-medium text-text-primary mb-2 mt-4">
                {t('boards.addColumnModal.checkin.serviceLabel')}
              </label>
              <select
                value={service}
                onChange={e => setService(e.target.value)}
                className="w-full px-3 py-2 bg-bg-primary text-text-primary border border-border-light rounded-md focus:outline-none focus:border-monday-primary"
              >
                <option value="">{t('boards.addColumnModal.checkin.serviceNotSpecified')}</option>
                {CHECKIN_SERVICES.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value={CUSTOM_SERVICE}>
                  {t('boards.addColumnModal.checkin.serviceOther')}
                </option>
              </select>
              {service === CUSTOM_SERVICE && (
                <input
                  type="text"
                  value={customService}
                  onChange={e => setCustomService(e.target.value)}
                  placeholder={t('boards.addColumnModal.checkin.customServicePlaceholder')}
                  className="w-full mt-2 px-3 py-2 bg-bg-primary text-text-primary border border-border-light rounded-md focus:outline-none focus:border-monday-primary"
                />
              )}
              <p className="text-xs text-text-secondary mt-2">
                {t('boards.addColumnModal.checkin.serviceHint')}
              </p>

              <label className="block text-sm font-medium text-text-primary mb-2 mt-4">
                {t('boards.addColumnModal.checkin.stageColumnLabel')}
              </label>
              <select
                value={stageColumnId}
                onChange={e => setStageColumnId(e.target.value)}
                className="w-full px-3 py-2 bg-bg-primary text-text-primary border border-border-light rounded-md focus:outline-none focus:border-monday-primary"
              >
                <option value="">{t('boards.addColumnModal.checkin.stageColumnDisabled')}</option>
                {statusColumns.map(col => (
                  <option key={col.id} value={col.column_id}>
                    {col.column_name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-text-secondary mt-2">
                {t('boards.addColumnModal.checkin.stageColumnHint')}
              </p>
            </div>
          )}

          {/* Column Width */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-2">
              {t('boards.addColumnModal.widthLabel', { width })}
            </label>
            <input
              type="range"
              min="80"
              max="500"
              step="10"
              value={width}
              onChange={e => setWidth(parseInt(e.target.value))}
              className="w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--monday-primary) 0%, var(--monday-primary) ${((width - 80) / (500 - 80)) * 100}%, var(--border-light) ${((width - 80) / (500 - 80)) * 100}%, var(--border-light) 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-text-tertiary mt-1">
              <span>{t('boards.addColumnModal.widthNarrow')}</span>
              <span>{t('boards.addColumnModal.widthWide')}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-light">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:bg-bg-hover rounded-md transition-colors"
            >
              {t('boards.addColumnModal.cancel')}
            </button>
            <button
              type="submit"
              disabled={
                !columnName.trim() ||
                (selectedType === 'company_address' && companyColumns.length === 0)
              }
              className={cn(
                'px-4 py-2 bg-monday-primary text-white rounded-md transition-colors',
                columnName.trim() &&
                  !(selectedType === 'company_address' && companyColumns.length === 0)
                  ? 'hover:bg-monday-primary-hover'
                  : 'opacity-50 cursor-not-allowed'
              )}
            >
              {t('boards.addColumnModal.addColumn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
