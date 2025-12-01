'use client'

import { User, Mail, Phone, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

interface Inspector {
  id: string
  full_name: string
  email: string
  phone: string
  specialty: string
  status: 'active' | 'inactive'
}

interface Props {
  inspectors: Inspector[]
  onDelete?: (id: string) => void
  onToggleStatus?: (id: string, status: 'active' | 'inactive') => void
}

export function InspectorTable({ inspectors, onDelete, onToggleStatus }: Props) {
  const handleDelete = async (id: string, name: string) => {
    if (confirm(`დარწმუნებული ხართ, რომ გსურთ ${name}-ის წაშლა?`)) {
      try {
        await onDelete?.(id)
        alert('ინსპექტორი წაიშალა')
      } catch (error) {
        alert('წაშლისას დაფიქსირდა შეცდომა')
      }
    }
  }

  const handleToggleStatus = async (inspector: Inspector) => {
    const newStatus = inspector.status === 'active' ? 'inactive' : 'active'
    try {
      await onToggleStatus?.(inspector.id, newStatus)
    } catch (error) {
      alert('სტატუსის ცვლილებისას დაფიქსირდა შეცდომა')
    }
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ინსპექტორი
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                კონტაქტი
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                სპეციალობა
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                სტატუსი
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                მოქმედებები
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {inspectors.map((inspector) => (
              <tr 
                key={inspector.id} 
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {inspector.full_name}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      {inspector.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      {inspector.phone}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {inspector.specialty}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleToggleStatus(inspector)}
                    className="flex items-center gap-2"
                  >
                    {inspector.status === 'active' ? (
                      <>
                        <ToggleRight className="w-6 h-6 text-green-600" />
                        <span className="text-sm font-medium text-green-600">
                          აქტიური
                        </span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-6 h-6 text-gray-400" />
                        <span className="text-sm font-medium text-gray-600">
                          არააქტიური
                        </span>
                      </>
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDelete(inspector.id, inspector.full_name)}
                    className="inline-flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    წაშლა
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inspectors.length === 0 && (
        <div className="p-12 text-center text-gray-500">
          ინსპექტორები არ არის
        </div>
      )}
    </div>
  )
}
