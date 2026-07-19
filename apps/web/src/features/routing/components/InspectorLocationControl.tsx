'use client'

import { useEffect, useRef, useState } from 'react'
import {
  MapPin,
  Navigation,
  Loader2,
  Search,
  X,
  Check,
  AlertCircle,
  ExternalLink,
  Trash2,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { useGps } from '@/hooks/useGps'
import { useToast } from '@/components/ui-monday/Toast'
import { useInspectorLocation } from '../hooks/useInspectorLocation'
import { resolveLocation, type GeocodeResult } from '../lib/geocode'
import type { Board } from '@/types/board'

type Mode = 'gps' | 'manual'

interface InspectorLocationControlProps {
  board: Board
}

export function InspectorLocationControl({ board }: InspectorLocationControlProps) {
  const t = useTranslations()
  const { showToast } = useToast()
  const { start, save, clear, isSaving } = useInspectorLocation(board)

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('gps')
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const hasLocation = !!start

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={e => {
          e.stopPropagation()
          setOpen(v => !v)
        }}
        title={t('routing.startLocation')}
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors',
          hasLocation
            ? 'bg-green-500/10 text-green-600 border border-green-500/30 hover:bg-green-500/20'
            : 'bg-bg-tertiary text-text-tertiary hover:bg-bg-hover'
        )}
      >
        <MapPin className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">
          {hasLocation ? t('routing.locationSet') : t('routing.setLocation')}
        </span>
      </button>

      {open && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute right-0 top-full mt-1 z-50 w-72 bg-bg-primary rounded-lg border border-monday-primary shadow-lg p-3"
        >
          {/* Current saved location */}
          {start && (
            <div className="mb-3 p-2.5 rounded-lg bg-bg-secondary">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">
                    {start.address || `${start.lat.toFixed(5)}, ${start.lng.toFixed(5)}`}
                  </p>
                  <p className="text-[11px] text-text-tertiary">
                    {start.mode === 'gps' ? t('routing.viaGps') : t('routing.viaAddress')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await clear()
                      showToast(t('routing.locationCleared'), 'success')
                    } catch {
                      showToast(t('routing.locationSaveFailed'), 'error')
                    }
                  }}
                  title={t('routing.clearLocation')}
                  className="p-1 rounded hover:bg-red-500/10 flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
              <a
                href={`https://www.google.com/maps?q=${start.lat},${start.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-monday-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                {t('routing.openMap')}
              </a>
            </div>
          )}

          {/* Mode switch */}
          <div className="flex gap-1 p-0.5 rounded-lg bg-bg-secondary mb-3">
            <ModeButton active={mode === 'gps'} onClick={() => setMode('gps')} icon={Navigation}>
              {t('routing.gpsMode')}
            </ModeButton>
            <ModeButton active={mode === 'manual'} onClick={() => setMode('manual')} icon={Search}>
              {t('routing.addressMode')}
            </ModeButton>
          </div>

          {mode === 'gps' ? (
            <GpsPanel
              active={open && mode === 'gps'}
              isSaving={isSaving}
              onSave={async (lat, lng) => {
                try {
                  await save({ mode: 'gps', lat, lng })
                  showToast(t('routing.locationSaved'), 'success')
                  setOpen(false)
                } catch {
                  showToast(t('routing.locationSaveFailed'), 'error')
                }
              }}
            />
          ) : (
            <AddressPanel
              isSaving={isSaving}
              onSave={async r => {
                try {
                  await save({ mode: 'manual', lat: r.lat, lng: r.lng, address: r.label })
                  showToast(t('routing.locationSaved'), 'success')
                  setOpen(false)
                } catch {
                  showToast(t('routing.locationSaveFailed'), 'error')
                }
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Navigation
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors',
        active
          ? 'bg-bg-primary text-monday-primary shadow-sm'
          : 'text-text-secondary hover:text-text-primary'
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {children}
    </button>
  )
}

function GpsPanel({
  active,
  isSaving,
  onSave,
}: {
  active: boolean
  isSaving: boolean
  onSave: (lat: number, lng: number) => void
}) {
  const t = useTranslations()
  const { coords, error } = useGps(active)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-bg-secondary">
        {coords ? (
          <>
            <Navigation className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-xs text-text-primary flex-1">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </span>
            <span className="text-[11px] text-text-tertiary">±{coords.accuracy}მ</span>
          </>
        ) : error ? (
          <>
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-xs text-red-500">{error}</span>
          </>
        ) : (
          <>
            <Loader2 className="w-4 h-4 text-text-tertiary animate-spin flex-shrink-0" />
            <span className="text-xs text-text-secondary">{t('routing.gpsWaiting')}</span>
          </>
        )}
      </div>
      <button
        type="button"
        disabled={!coords || isSaving}
        onClick={() => coords && onSave(coords.lat, coords.lng)}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-monday-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {t('routing.useThisLocation')}
      </button>
    </div>
  )
}

function AddressPanel({
  isSaving,
  onSave,
}: {
  isSaving: boolean
  onSave: (result: GeocodeResult) => void
}) {
  const t = useTranslations()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setSearched(true)
    try {
      setResults(await resolveLocation(query))
    } catch (err: any) {
      setError(err.message || t('routing.geocodeFailed'))
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border-light focus-within:border-monday-primary bg-bg-primary">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder={t('routing.addressPlaceholder')}
          className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-tertiary outline-none min-w-0"
        />
        <button
          type="button"
          onClick={search}
          disabled={loading || !query.trim()}
          className="text-text-tertiary hover:text-monday-primary disabled:opacity-40"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {error && <p className="text-[11px] text-red-500 px-1">{error}</p>}

      {!error && searched && !loading && results.length === 0 && (
        <p className="text-[11px] text-text-tertiary px-1">{t('routing.noResults')}</p>
      )}

      {results.length > 0 && (
        <div className="max-h-40 overflow-y-auto divide-y divide-border-light rounded-lg border border-border-light">
          {results.map((r, i) => (
            <button
              key={`${r.lat}-${r.lng}-${i}`}
              type="button"
              disabled={isSaving}
              onClick={() => onSave(r)}
              className="w-full flex items-start gap-2 px-2.5 py-2 text-left hover:bg-bg-hover transition-colors disabled:opacity-50"
            >
              <MapPin className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0 mt-0.5" />
              <span className="text-xs text-text-primary break-words">{r.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
