'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { PageHeader, LoadingSpinner } from '@/shared/components/ui'
import {
  AssignmentStatCards,
  CompanyAssignmentTable,
  InspectorWorkloadPanel,
} from '@/features/assignments/components'
import { useCompanyAssignments } from '@/features/assignments/hooks'
import { DEPLOYMENT_CONFIG } from '@/config/features'

export default function AssignmentsPage() {
  const t = useTranslations()
  // For now, use 'all' to avoid UUID issues
  // TODO: Get actual UUID for personal_data_protection service type from database
  const [selectedServiceType, setSelectedServiceType] = useState('all')

  const { assignments, serviceTypes, inspectorWorkload, stats, loading, error, handleBulkAssign } =
    useCompanyAssignments(selectedServiceType)

  if (loading) {
    return <LoadingSpinner message={t('assignments.loadingCompanies')} />
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-color-error mb-4">{t('assignments.errorOccurred')}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-monday-primary text-white rounded-lg hover:bg-monday-primary-hover"
          >
            {t('assignments.tryAgain')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-secondary">
      <PageHeader
        title={t('assignments.pageTitle')}
        description={t('assignments.pageDescription')}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AssignmentStatCards stats={stats} inspectorCount={inspectorWorkload.length} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CompanyAssignmentTable
              assignments={assignments}
              serviceTypes={serviceTypes}
              inspectors={inspectorWorkload}
              onBulkAssign={handleBulkAssign}
            />
          </div>

          <div className="lg:col-span-1">
            <InspectorWorkloadPanel inspectors={inspectorWorkload} />
          </div>
        </div>
      </div>
    </div>
  )
}
