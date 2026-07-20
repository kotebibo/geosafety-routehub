'use client'

import { useState } from 'react'
import { MapPin, Search, Loader2, X, ExternalLink } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { resolveLocation, type GeocodeResult } from '../lib/geocode'

export interface PickedLocation {
  lat: number
  lng: number
  address: string | null
}

interface LocationSearchFieldProps {
  label: string
  value: PickedLocation | null
  onChange: (value: PickedLocation | null) => void
}

/**
 * Address-search location picker for admin-set officer locations (home /
 * route start). Resolves free text or coordinates via the geocode endpoint —
 * no GPS, since the admin isn't physically at the officer's location.
 */
export function LocationSearchField({ label, value, onChange }: LocationSearchFieldProps) {
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

  const pick = (r: GeocodeResult) => {
    onChange({ lat: r.lat, lng: r.lng, address: r.label })
    setQuery('')
    setResults([])
    setSearched(false)
  }

  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>

      {value && (
        <div className="mb-2 flex items-start gap-2 p-2.5 rounded-lg bg-bg-secondary">
          <MapPin className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-primary break-words">
              {value.address || `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`}
            </p>
            <a
              href={`https://www.google.com/maps?q=${value.lat},${value.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1 text-[11px] text-monday-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              {t('routing.openMap')}
            </a>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            title={t('routing.clearLocation')}
            className="p-1 rounded hover:bg-red-500/10 flex-shrink-0"
          >
            <X className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border-light focus-within:border-monday-primary bg-bg-primary">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), search())}
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

      {error && <p className="text-[11px] text-red-500 px-1 mt-1">{error}</p>}
      {!error && searched && !loading && results.length === 0 && (
        <p className="text-[11px] text-text-tertiary px-1 mt-1">{t('routing.noResults')}</p>
      )}
      {results.length > 0 && (
        <div className="mt-1 max-h-40 overflow-y-auto divide-y divide-border-light rounded-lg border border-border-light">
          {results.map((r, i) => (
            <button
              key={`${r.lat}-${r.lng}-${i}`}
              type="button"
              onClick={() => pick(r)}
              className="w-full flex items-start gap-2 px-2.5 py-2 text-left hover:bg-bg-hover transition-colors"
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
