import { User, TrendingUp } from 'lucide-react'

interface InspectorWorkload {
  id: string
  full_name: string
  specialty: string
  assignedCount: number
}

interface InspectorWorkloadPanelProps {
  inspectors: InspectorWorkload[]
}

export function InspectorWorkloadPanel({ inspectors }: InspectorWorkloadPanelProps) {
  const maxAssignments = Math.max(...inspectors.map(i => i.assignedCount), 1)

  return (
    <div className="bg-white rounded-lg border sticky top-4">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          ინსპექტორების დატვირთვა
        </h3>
      </div>
      
      <div className="p-4 space-y-4">
        {inspectors.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            ინსპექტორები არ არის
          </p>
        ) : (
          inspectors.map((inspector) => {
            const percentage = (inspector.assignedCount / maxAssignments) * 100
            
            return (
              <div key={inspector.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">
                      {inspector.full_name}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-blue-600">
                    {inspector.assignedCount}
                  </span>
                </div>
                
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                
                <p className="text-xs text-gray-500">
                  {inspector.specialty}
                </p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
