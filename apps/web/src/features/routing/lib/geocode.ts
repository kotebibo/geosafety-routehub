import { parseCoordinates } from '@/lib/geo-utils'

export interface GeocodeResult {
  lat: number
  lng: number
  label: string
}

/**
 * Resolve free text to coordinates. Tries a direct coordinate/Google-Maps-link
 * parse first (instant, offline), then falls back to server-side geocoding.
 */
export async function resolveLocation(input: string): Promise<GeocodeResult[]> {
  const text = input.trim()
  if (!text) return []

  const direct = parseCoordinates(text)
  if (direct) {
    return [{ ...direct, label: `${direct.lat.toFixed(6)}, ${direct.lng.toFixed(6)}` }]
  }

  const res = await fetch(`/api/routing/geocode?q=${encodeURIComponent(text)}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Geocoding failed')
  }
  return res.json()
}
