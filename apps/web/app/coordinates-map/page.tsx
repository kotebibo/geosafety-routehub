'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuth } from '@/contexts/AuthContext'
import { useCoordinateItems } from '@/features/coordinates-map/hooks/useCoordinateItems'
import { CoordinatesFilterPanel } from '@/features/coordinates-map/components/CoordinatesFilterPanel'
import { RefreshCw, MapPin, GitCompareArrows } from 'lucide-react'

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

const ComparisonMap = dynamic(
  () =>
    import('@/features/coordinates-map/components/ComparisonMap').then(mod => mod.ComparisonMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-text-tertiary" />
      </div>
    ),
  }
)

type MapView = 'coordinates' | 'comparison'

export default function CoordinatesMapPage() {
  const { userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const currentRole = userRole?.role || ''
  const isAllowed = currentRole === 'admin' || currentRole === 'dispatcher'

  const [inspectorFilter, setInspectorFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeView, setActiveView] = useState<MapView>('coordinates')

  const { items, allItems, inspectors, isLoading, lastUpdated } = useCoordinateItems({
    inspectorFilter,
    searchQuery,
  })

  const comparisonCount = useMemo(
    () => items.filter(i => i.addressLat !== null && i.addressLng !== null).length,
    [items]
  )

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
      <div className="flex-1 flex flex-col relative">
        {/* View tabs */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-border-primary bg-bg-primary z-10">
          <button
            onClick={() => setActiveView('coordinates')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeView === 'coordinates'
                ? 'bg-accent-primary text-white'
                : 'text-text-secondary hover:bg-bg-secondary'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            კოორდინატები
            <span
              className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                activeView === 'coordinates' ? 'bg-white/20' : 'bg-bg-tertiary'
              }`}
            >
              {items.length}
            </span>
          </button>
          <button
            onClick={() => setActiveView('comparison')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeView === 'comparison'
                ? 'bg-accent-primary text-white'
                : 'text-text-secondary hover:bg-bg-secondary'
            }`}
          >
            <GitCompareArrows className="w-3.5 h-3.5" />
            შედარება
            <span
              className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                activeView === 'comparison' ? 'bg-white/20' : 'bg-bg-tertiary'
              }`}
            >
              {comparisonCount}
            </span>
          </button>
        </div>

        {/* Map area */}
        <div className="flex-1 relative">
          {activeView === 'coordinates' && (
            <>
              <CoordinatesMap items={items} inspectors={inspectors} />
              {items.length === 0 && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-bg-primary/90 rounded-lg px-6 py-4 text-center shadow-sm">
                    <p className="text-text-secondary text-sm">კოორდინატები ვერ მოიძებნა</p>
                  </div>
                </div>
              )}
            </>
          )}
          {activeView === 'comparison' && (
            <>
              <ComparisonMap items={items} />
              {comparisonCount === 0 && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-bg-primary/90 rounded-lg px-6 py-4 text-center shadow-sm">
                    <p className="text-text-secondary text-sm">
                      გეოკოდირებული მონაცემები ვერ მოიძებნა
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
