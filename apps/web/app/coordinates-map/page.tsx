'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import { useCoordinateItems } from '@/features/coordinates-map/hooks/useCoordinateItems'
import { CoordinatesFilterPanel } from '@/features/coordinates-map/components/CoordinatesFilterPanel'
import { CoordinatesMapSkeleton } from '@/features/coordinates-map/components/CoordinatesMapSkeleton'
import { RefreshCw, PanelLeftOpen } from 'lucide-react'
import type { MapFocus } from '@/features/coordinates-map/components/CoordinatesMap'
import type { CoordinateItem } from '@/features/coordinates-map/types'

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
  const t = useTranslations()
  const { userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const currentRole = userRole?.role || ''
  const isAllowed = currentRole === 'admin' || currentRole === 'dispatcher'

  const [inspectorFilter, setInspectorFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [focus, setFocus] = useState<MapFocus | null>(null)

  const { items, allItems, inspectors, isLoading, isFetching, lastUpdated, refresh } =
    useCoordinateItems({ inspectorFilter, searchQuery })

  const handleSelectItem = useCallback((item: CoordinateItem) => {
    setFocus(prev => ({ id: item.id, nonce: (prev?.nonce ?? 0) + 1 }))
  }, [])

  useEffect(() => {
    if (!authLoading && !isAllowed) {
      router.push('/')
    }
  }, [authLoading, isAllowed, router])

  if (authLoading || !isAllowed) {
    return <CoordinatesMapSkeleton />
  }

  return (
    <div className="flex h-full">
      {sidebarOpen && (
        <CoordinatesFilterPanel
          items={items}
          allItems={allItems}
          inspectors={inspectors}
          selectedInspector={inspectorFilter}
          onInspectorChange={setInspectorFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedItemId={focus?.id ?? null}
          onSelectItem={handleSelectItem}
          lastUpdated={lastUpdated}
          isLoading={isLoading}
          isRefreshing={isFetching}
          onRefresh={refresh}
          onCollapse={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 relative isolate min-w-0">
        <CoordinatesMap items={items} inspectors={inspectors} focus={focus} />

        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            title={t('coordinatesMap.filterPanel.showPanel')}
            className="absolute top-3 left-3 z-[1000] p-1.5 rounded-md bg-bg-primary border border-border-light shadow-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}

        {items.length === 0 && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-bg-primary/90 rounded-lg px-6 py-4 text-center shadow-sm border border-border-light">
              <p className="text-text-secondary text-sm">{t('coordinatesMap.emptyCoordinates')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
