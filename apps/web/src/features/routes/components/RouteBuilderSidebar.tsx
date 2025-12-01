'use client'

import { User, CheckSquare, Square, Loader2 } from 'lucide-react'

interface Inspector {
  id: string
  full_name: string
  specialty: string
}

interface Company {
  id: string
  name: string
  address: string
}

interface Props {
  inspectors: Inspector[]
  selectedInspector: string
  onInspectorChange: (id: string) => void
  companies: Company[]
  selectedCompanies: Set<string>
  onToggleCompany: (id: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
  loading?: boolean
}

export function RouteBuilderSidebar({
  inspectors,
  selectedInspector,
  onInspectorChange,
  companies,
  selectedCompanies,
  onToggleCompany,
  onSelectAll,
  onClearSelection,
  loading,
}: Props) {
  return (
    <div className="w-80 bg-white border-r h-screen overflow-y-auto">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-4">მარშრუტის შექმნა</h2>
        
        {/* Inspector Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            <User className="w-4 h-4 inline mr-1" />
            ინსპექტორი
          </label>
          <select
            value={selectedInspector}
            onChange={(e) => onInspectorChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">აირჩიეთ ინსპექტორი...</option>
            {inspectors.map(inspector => (
              <option key={inspector.id} value={inspector.id}>
                {inspector.full_name} ({inspector.specialty})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Companies List */}
      {selectedInspector && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">
              კომპანიები ({companies.length})
            </h3>
            <div className="flex gap-2">
              <button
                onClick={onSelectAll}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                ყველა
              </button>
              <button
                onClick={onClearSelection}
                className="text-xs text-gray-600 hover:text-gray-700"
              >
                გასუფთავება
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : companies.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              ამ ინსპექტორს არ აქვს დანიშნული კომპანიები
            </p>
          ) : (
            <div className="space-y-2">
              {companies.map(company => {
                const isSelected = selectedCompanies.has(company.id)
                return (
                  <button
                    key={company.id}
                    onClick={() => onToggleCompany(company.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {company.name}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {company.address}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {selectedCompanies.size > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                არჩეული: {selectedCompanies.size}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
