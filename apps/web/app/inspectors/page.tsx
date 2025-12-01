'use client'

import { useRouter } from 'next/navigation'
import { PageHeader, LoadingSpinner, StatCard, EmptyState } from '@/shared/components/ui'
import { InspectorTable } from '@/features/inspectors/components'
import { useInspectors } from '@/features/inspectors/hooks'
import { Users, UserCheck, UserX, Plus } from 'lucide-react'

export default function InspectorsPage() {
  const router = useRouter()
  const {
    inspectors,
    loading,
    error,
    deleteInspector,
    updateInspectorStatus,
  } = useInspectors()

  if (loading) {
    return <LoadingSpinner message="ინსპექტორების ჩატვირთვა..." />
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

  const activeInspectors = inspectors.filter(i => i.status === 'active')
  const inactiveInspectors = inspectors.filter(i => i.status === 'inactive')

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="ინსპექტორები"
        description="ყველა რეგისტრირებული ინსპექტორი"
        action={{
          label: 'ახალი ინსპექტორი',
          onClick: () => router.push('/inspectors/new'),
          icon: <Plus className="w-5 h-5" />,
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            label="სულ ინსპექტორები"
            value={inspectors.length}
            icon={Users}
            color="blue"
          />
          <StatCard
            label="აქტიური"
            value={activeInspectors.length}
            icon={UserCheck}
            color="green"
          />
          <StatCard
            label="არააქტიური"
            value={inactiveInspectors.length}
            icon={UserX}
            color="amber"
          />
        </div>

        {/* Inspectors Table */}
        {inspectors.length === 0 ? (
          <EmptyState
            icon={<Users className="w-16 h-16" />}
            title="ინსპექტორები არ არის"
            description="დაამატეთ პირველი ინსპექტორი"
            action={{
              label: 'ახალი ინსპექტორი',
              onClick: () => router.push('/inspectors/new'),
            }}
          />
        ) : (
          <InspectorTable
            inspectors={inspectors}
            onDelete={deleteInspector}
            onToggleStatus={updateInspectorStatus}
          />
        )}
      </div>
    </div>
  )
}
