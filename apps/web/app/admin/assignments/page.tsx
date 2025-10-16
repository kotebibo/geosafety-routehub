'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AssignmentStatCards } from '@/components/assignments/AssignmentStatCards'
import { CompanyAssignmentTable } from '@/components/assignments/CompanyAssignmentTable'
import { InspectorWorkloadPanel } from '@/components/assignments/InspectorWorkloadPanel'
import { useCompanyAssignments } from '@/hooks/useCompanyAssignments'
import { DEPLOYMENT_CONFIG } from '@/config/features'

export default function AssignmentsPage() {
  // For now, use 'all' to avoid UUID issues
  // TODO: Get actual UUID for personal_data_protection service type from database
  const [selectedServiceType, setSelectedServiceType] = useState('all')
  
  const {
    assignments,
    serviceTypes,
    inspectorWorkload,
    stats,
    loading,
    error,
    handleBulkAssign,
  } = useCompanyAssignments(selectedServiceType)

  if (loading) {
    return <LoadingSpinner message="კომპანიების ჩატვირთვა..." />
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">დაფიქსირდა შეცდომა</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            თავიდან ცდა
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader 
        title="კომპანიების დანიშვნა"
        description="მიანიჭეთ კომპანიები ინსპექტორებს"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AssignmentStatCards 
          stats={stats}
          inspectorCount={inspectorWorkload.length}
        />

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
