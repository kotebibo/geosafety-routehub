'use client'

import { useState, useMemo } from 'react'
import { Filter, Users } from 'lucide-react'
import { DEPLOYMENT_CONFIG } from '@/config/features'
import { FeatureGate } from '@/components/FeatureGate'
import { DataTable } from '@/shared/components/ui'
import type { Column } from '@/shared/components/ui'

interface CompanyAssignment {
  id: string
  company: {
    id: string
    name: string
    address: string
  }
  service_type: {
    id: string
    name: string
    name_ka: string
  }
  assigned_inspector: {
    id: string
    full_name: string
  } | null
}

interface CompanyAssignmentTableProps {
  assignments: CompanyAssignment[]
  serviceTypes: { id: string; name_ka: string }[]
  inspectors: { id: string; full_name: string }[]
  onBulkAssign: (ids: string[], inspectorId: string | null) => Promise<void>
}

export function CompanyAssignmentTable({
  assignments,
  serviceTypes,
  inspectors,
  onBulkAssign
}: CompanyAssignmentTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('all')
  const [assigningTo, setAssigningTo] = useState<string>('')
  const [isAssigning, setIsAssigning] = useState(false)

  const filteredAssignments = useMemo(() =>
    filter === 'all'
      ? assignments
      : assignments.filter(a => a.service_type.id === filter),
    [assignments, filter]
  )

  const handleBulkAssign = async () => {
    if (selected.size === 0) {
      alert('აირჩიეთ მინიმუმ ერთი კომპანია')
      return
    }

    if (!assigningTo) {
      alert('აირჩიეთ ინსპექტორი')
      return
    }

    try {
      setIsAssigning(true)
      const inspectorId = assigningTo === 'unassign' ? null : assigningTo
      await onBulkAssign(Array.from(selected), inspectorId)
      setSelected(new Set())
      setAssigningTo('')
      alert('წარმატებით დაინიშნა!')
    } catch {
      alert('დაფიქსირდა შეცდომა')
    } finally {
      setIsAssigning(false)
    }
  }

  const columns = useMemo<Column<CompanyAssignment>[]>(() => [
    {
      id: 'company',
      header: 'კომპანია',
      accessorFn: (row) => row.company?.name,
      sortable: true,
      cell: ({ value }) => (
        <span className="font-medium text-gray-900">{value as string}</span>
      ),
    },
    {
      id: 'address',
      header: 'მისამართი',
      accessorFn: (row) => row.company?.address,
      sortable: true,
      cell: ({ value }) => (
        <span className="text-gray-600">{value as string}</span>
      ),
    },
    {
      id: 'service',
      header: 'სერვისი',
      accessorFn: (row) => row.service_type?.name_ka,
      sortable: true,
      cell: ({ value }) => (
        <span className="text-gray-600">{(value as string) || 'N/A'}</span>
      ),
    },
    {
      id: 'inspector',
      header: 'ინსპექტორი',
      accessorFn: (row) => row.assigned_inspector?.full_name,
      sortable: true,
      cell: ({ row }) => (
        row.assigned_inspector ? (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            {row.assigned_inspector.full_name}
          </span>
        ) : (
          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
            არადანიშნული
          </span>
        )
      ),
    },
  ], [])

  return (
    <div className="bg-white rounded-lg border">
      {/* Header with filters and actions */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <FeatureGate feature="ENABLE_SERVICE_FILTERING">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <span className="font-medium">ფილტრი:</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">ყველა სერვისი</option>
                {serviceTypes.map(st => (
                  <option key={st.id} value={st.id}>
                    {st.name_ka}
                  </option>
                ))}
              </select>
            </div>
          </FeatureGate>

          <div className="text-sm text-gray-600">
            {selected.size > 0 && (
              <span className="font-medium text-blue-600">
                {selected.size} არჩეული
              </span>
            )}
          </div>
        </div>

        {/* Bulk assignment controls */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
            <select
              value={assigningTo}
              onChange={(e) => setAssigningTo(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">აირჩიეთ ინსპექტორი...</option>
              <option value="unassign">გაუქმება</option>
              {inspectors.map(inspector => (
                <option key={inspector.id} value={inspector.id}>
                  {inspector.full_name}
                </option>
              ))}
            </select>
            <button
              onClick={handleBulkAssign}
              disabled={isAssigning || !assigningTo}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isAssigning ? 'ინიშნება...' : 'დანიშვნა'}
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <DataTable
        data={filteredAssignments}
        columns={columns}
        selectable
        selectedRows={selected}
        onSelectionChange={setSelected}
        getRowId={(row) => row.id}
        emptyState={
          <div className="text-center text-gray-500">
            კომპანიები არ მოიძებნა
          </div>
        }
        caption="კომპანიების დანიშვნების სია"
        className="rounded-t-none border-t-0"
      />
    </div>
  )
}
