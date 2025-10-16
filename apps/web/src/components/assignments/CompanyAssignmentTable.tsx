'use client'

import { useState } from 'react'
import { Filter, Users, CheckSquare, Square } from 'lucide-react'
import { DEPLOYMENT_CONFIG } from '@/config/features'
import { FeatureGate } from '@/components/FeatureGate'

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

interface Props {
  assignments: CompanyAssignment[]
  serviceTypes: any[]
  inspectors: any[]
  onBulkAssign: (ids: string[], inspectorId: string | null) => Promise<void>
}

export function CompanyAssignmentTable({ 
  assignments, 
  serviceTypes, 
  inspectors,
  onBulkAssign 
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('all')
  const [assigningTo, setAssigningTo] = useState<string>('')
  const [isAssigning, setIsAssigning] = useState(false)

  const filteredAssignments = filter === 'all'
    ? assignments
    : assignments.filter(a => a.service_type.id === filter)

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelected(newSelected)
  }

  const toggleAll = () => {
    if (selected.size === filteredAssignments.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filteredAssignments.map(a => a.id)))
    }
  }

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
    } catch (error) {
      alert('დაფიქსირდა შეცდომა')
    } finally {
      setIsAssigning(false)
    }
  }

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
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-4 py-3">
                <button
                  onClick={toggleAll}
                  className="flex items-center justify-center"
                >
                  {selected.size === filteredAssignments.length && filteredAssignments.length > 0 ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                კომპანია
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                მისამართი
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                სერვისი
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ინსპექტორი
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredAssignments.map((assignment) => (
              <tr
                key={assignment.id}
                className={`hover:bg-gray-50 transition-colors ${
                  selected.has(assignment.id) ? 'bg-blue-50' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleSelection(assignment.id)}
                    className="flex items-center justify-center"
                  >
                    {selected.has(assignment.id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {assignment.company.name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {assignment.company.address}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {assignment.service_type.name_ka}
                </td>
                <td className="px-4 py-3 text-sm">
                  {assignment.assigned_inspector ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      {assignment.assigned_inspector.full_name}
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                      არადანიშნული
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAssignments.length === 0 && (
        <div className="p-12 text-center text-gray-500">
          კომპანიები არ მოიძებნა
        </div>
      )}
    </div>
  )
}
