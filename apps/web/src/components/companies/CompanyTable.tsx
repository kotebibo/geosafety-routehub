'use client'

import { Building2, MapPin, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Company {
  id: string
  name: string
  address: string
  lat: number
  lng: number
}

interface Props {
  companies: Company[]
  onDelete?: (id: string) => void
}

export function CompanyTable({ companies, onDelete }: Props) {
  const router = useRouter()

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`დარწმუნებული ხართ, რომ გსურთ ${name}-ის წაშლა?`)) {
      try {
        await onDelete?.(id)
        alert('კომპანია წაიშალა')
      } catch (error) {
        alert('წაშლისას დაფიქსირდა შეცდომა')
      }
    }
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                კომპანია
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                მისამართი
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                კოორდინატები
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                მოქმედებები
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {companies.map((company) => (
              <tr 
                key={company.id} 
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => router.push(`/companies/${company.id}`)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {company.name}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    {company.address}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {company.lat.toFixed(4)}, {company.lng.toFixed(4)}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(company.id, company.name)
                    }}
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

      {companies.length === 0 && (
        <div className="p-12 text-center text-gray-500">
          კომპანიები არ მოიძებნა
        </div>
      )}
    </div>
  )
}
