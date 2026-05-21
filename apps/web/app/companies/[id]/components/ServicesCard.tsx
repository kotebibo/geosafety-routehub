'use client'

import { Shield, Edit2, Save, X, User, Clock, AlertTriangle } from 'lucide-react'
import { PDPOnboardingManager } from '@/components/PDPOnboardingManager'

interface CompanyService {
  id: string
  service_type_id: string | null
  inspection_frequency_days: number | null
  assigned_inspector_id: string | null
  priority: string | null
  next_inspection_date: string | null
  last_inspection_date: string | null
  status: string | null
  service_types: {
    name: string
    name_ka: string
  } | null
  inspectors: {
    full_name: string
  } | null
}

const priorityConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  high: {
    label: '\u10DB\u10D0\u10E6\u10D0\u10DA\u10D8',
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
  medium: {
    label: '\u10E1\u10D0\u10E8\u10E3\u10D0\u10DA\u10DD',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  low: {
    label: '\u10D3\u10D0\u10D1\u10D0\u10DA\u10D8',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
}

function isOverdue(nextDate: string | null): boolean {
  if (!nextDate) return false
  return new Date(nextDate) < new Date()
}

function daysUntil(date: string): number {
  const diff = new Date(date).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

interface ServicesCardProps {
  services: CompanyService[]
  companyId: string
  editingServices: boolean
  onStartEdit: () => void
  onFinish: () => void
  onCancel: () => void
}

export function ServicesCard({
  services,
  companyId,
  editingServices,
  onStartEdit,
  onFinish,
  onCancel,
}: ServicesCardProps) {
  return (
    <div className="bg-bg-primary border border-border-light rounded-xl mb-6 overflow-hidden">
      <div className="px-6 py-4 border-b border-border-light flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4.5 h-4.5 text-text-tertiary" />
          <h2 className="font-semibold text-text-primary">
            {'\u10E1\u10D4\u10E0\u10D5\u10D8\u10E1\u10D4\u10D1\u10D8'}
          </h2>
          <span className="text-xs text-text-tertiary font-medium bg-bg-tertiary px-1.5 py-0.5 rounded">
            {services.length}
          </span>
        </div>
        {!editingServices && (
          <button
            onClick={onStartEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            {'\u10E0\u10D4\u10D3\u10D0\u10E5\u10E2\u10D8\u10E0\u10D4\u10D1\u10D0'}
          </button>
        )}
      </div>

      <div className="p-6">
        {editingServices ? (
          <div>
            <PDPOnboardingManager
              companyId={companyId}
              onPhaseChange={() => {
                // Phase change handled by PDPOnboardingManager
              }}
            />
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-border-light">
              <button
                onClick={onFinish}
                className="flex items-center gap-2 px-5 py-2 bg-monday-primary text-white text-sm font-medium rounded-lg hover:bg-monday-primary-hover transition-colors"
              >
                <Save className="w-4 h-4" />
                {'\u10D3\u10D0\u10E1\u10E0\u10E3\u10DA\u10D4\u10D1\u10D0'}
              </button>
              <button
                onClick={onCancel}
                className="flex items-center gap-2 px-5 py-2 text-sm text-text-secondary hover:bg-bg-hover rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                {'\u10D2\u10D0\u10E3\u10E5\u10DB\u10D4\u10D1\u10D0'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {services.length === 0 ? (
              <div className="text-center py-10">
                <Shield className="w-10 h-10 text-text-disabled mx-auto mb-3" />
                <p className="text-sm text-text-tertiary mb-4">
                  {
                    '\u10E1\u10D4\u10E0\u10D5\u10D8\u10E1\u10D4\u10D1\u10D8 \u10D0\u10E0 \u10D0\u10E0\u10D8\u10E1 \u10D3\u10D0\u10DB\u10D0\u10E2\u10D4\u10D1\u10E3\u10DA\u10D8'
                  }
                </p>
                <button
                  onClick={onStartEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-monday-primary text-white rounded-lg hover:bg-monday-primary-hover transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  {
                    '\u10E1\u10D4\u10E0\u10D5\u10D8\u10E1\u10D8\u10E1 \u10D3\u10D0\u10DB\u10D0\u10E2\u10D4\u10D1\u10D0'
                  }
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {services.map(service => {
                  const overdue = isOverdue(service.next_inspection_date)
                  const days = service.next_inspection_date
                    ? daysUntil(service.next_inspection_date)
                    : null
                  const sPriority = priorityConfig[service.priority ?? 'low'] || priorityConfig.low

                  return (
                    <div
                      key={service.id}
                      className={`rounded-lg border p-4 transition-colors ${
                        overdue
                          ? 'border-red-200 bg-red-50/50'
                          : 'border-border-light bg-bg-secondary/50 hover:bg-bg-secondary'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 mb-2">
                            <h3 className="font-semibold text-text-primary text-sm">
                              {service.service_types?.name_ka || service.service_types?.name}
                            </h3>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${sPriority.bg} ${sPriority.text}`}
                            >
                              <span className={`w-1 h-1 rounded-full ${sPriority.dot}`} />
                              {sPriority.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-5 text-xs text-text-tertiary">
                            <span className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5" />
                              {service.inspectors?.full_name || (
                                <span className="text-amber-600">
                                  {
                                    '\u10D0\u10E0 \u10D0\u10E0\u10D8\u10E1 \u10DB\u10D8\u10DC\u10D8\u10ED\u10D4\u10D1\u10E3\u10DA\u10D8'
                                  }
                                </span>
                              )}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {'\u10E7\u10DD\u10D5\u10D4\u10DA'} {service.inspection_frequency_days}{' '}
                              {'\u10D3\u10E6\u10D4\u10E8\u10D8'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          {service.next_inspection_date ? (
                            <div>
                              <p
                                className={`text-sm font-medium ${overdue ? 'text-red-600' : 'text-text-primary'}`}
                              >
                                {new Date(service.next_inspection_date).toLocaleDateString('ka-GE')}
                              </p>
                              <p
                                className={`text-xs mt-0.5 ${overdue ? 'text-red-500' : 'text-text-tertiary'}`}
                              >
                                {overdue
                                  ? `${Math.abs(days!)} \u10D3\u10E6\u10D8\u10D7 \u10D5\u10D0\u10D3\u10D0\u10D2\u10D0\u10D3\u10D0\u10EA\u10D8\u10DA\u10D4\u10D1\u10E3\u10DA\u10D8`
                                  : days === 0
                                    ? '\u10D3\u10E6\u10D4\u10E1'
                                    : `${days} \u10D3\u10E6\u10D4\u10E8\u10D8`}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-text-tertiary">
                              {
                                '\u10D0\u10E0 \u10D0\u10E0\u10D8\u10E1 \u10D3\u10D0\u10D2\u10D4\u10D2\u10DB\u10D8\u10DA\u10D8'
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
