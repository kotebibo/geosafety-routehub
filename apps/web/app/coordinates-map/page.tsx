'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuth } from '@/contexts/AuthContext'
import { useCoordinateItems } from '@/features/coordinates-map/hooks/useCoordinateItems'
import { CoordinatesFilterPanel } from '@/features/coordinates-map/components/CoordinatesFilterPanel'
import { RefreshCw } from 'lucide-react'

const CoordinatesMap = dynamic(
  () =>
    import('@/features/coordinates-map/components/CoordinatesMap').then(mod => mod.CoordinatesMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-text-tertiary" />
      </div>
    ),
  }
)

export default function CoordinatesMapPage() {
  const { userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const currentRole = userRole?.role || ''
  const isAllowed = currentRole === 'admin' || currentRole === 'dispatcher'

  const [inspectorFilter, setInspectorFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const { items, allItems, inspectors, isLoading, lastUpdated } = useCoordinateItems({
    inspectorFilter,
    searchQuery,
  })

  useEffect(() => {
    if (!authLoading && !isAllowed) {
      router.push('/')
    }
  }, [authLoading, isAllowed, router])

  if (authLoading || !isAllowed) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 animate-spin text-text-tertiary" />
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <CoordinatesFilterPanel
        inspectors={inspectors}
        selectedInspector={inspectorFilter}
        onInspectorChange={setInspectorFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalCount={allItems.length}
        filteredCount={items.length}
        lastUpdated={lastUpdated}
        isLoading={isLoading}
      />
      <div className="flex-1 relative">
        <CoordinatesMap items={items} inspectors={inspectors} />
        {items.length === 0 && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-bg-primary/90 rounded-lg px-6 py-4 text-center shadow-sm">
              <p className="text-text-secondary text-sm">კოორდინატები ვერ მოიძებნა</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
