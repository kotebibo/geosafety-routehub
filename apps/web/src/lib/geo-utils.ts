export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export const CHECKIN_RADIUS_METERS = 150

// GPS accuracy is a margin of error, not noise to ignore — a reading whose
// accuracy radius overlaps the geofence should still be accepted, since the
// device may simply be unable to pinpoint closer (common indoors).
export function isWithinRadius(
  distanceMeters: number,
  accuracyMeters: number | null | undefined,
  radiusMeters: number
): boolean {
  const effectiveDistance = distanceMeters - (accuracyMeters ?? 0)
  return effectiveDistance <= radiusMeters
}

export function formatDuration(minutes: number, language: 'ka' | 'en' = 'ka'): string {
  const [hUnit, mUnit] = language === 'en' ? ['h', 'm'] : ['სთ', 'წთ']
  if (minutes < 60) return `${minutes}${mUnit}`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}${hUnit} ${m}${mUnit}` : `${h}${hUnit}`
}

export function formatElapsed(startTime: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000))
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  const s = diff % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

function isValidCoord(lat: number, lng: number): boolean {
  return isFinite(lat) && isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

function dmsToDecimal(deg: number, min: number, sec: number, direction: string): number {
  const decimal = deg + min / 60 + sec / 3600
  return direction === 'S' || direction === 'W' ? -decimal : decimal
}

function extractFromGoogleUrl(text: string): { lat: number; lng: number } | null {
  // query=LAT,LNG (most common — 85% of entries)
  const queryMatch = text.match(/query=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (queryMatch) {
    const lat = Number(queryMatch[1])
    const lng = Number(queryMatch[2])
    if (isValidCoord(lat, lng)) return { lat, lng }
  }

  // @LAT,LNG in maps URL path
  const atMatch = text.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (atMatch) {
    const lat = Number(atMatch[1])
    const lng = Number(atMatch[2])
    if (isValidCoord(lat, lng)) return { lat, lng }
  }

  // maps/place/LAT%C2%B0... encoded DMS — the query= param above catches these too,
  // but if someone pastes a place URL without query=, fall through to DMS parsing
  return null
}

function extractFromDms(text: string): { lat: number; lng: number } | null {
  // Matches: Latitude: N 41°43'21.46680" (with or without leading "L" typo)
  // Also handles Altitude-first format where Latitude appears later in text
  const dmsPattern =
    /[Ll]?atitude:\s*([NS])\s*(\d+)[°]\s*(\d+)['']\s*([\d.]+)[""]\s*(?:.*?)[Ll]ongitude:\s*([EW])\s*(\d+)[°]\s*(\d+)['']\s*([\d.]+)[""]?/
  const match = text.match(dmsPattern)
  if (match) {
    const lat = dmsToDecimal(Number(match[2]), Number(match[3]), Number(match[4]), match[1])
    const lng = dmsToDecimal(Number(match[6]), Number(match[7]), Number(match[8]), match[5])
    if (isValidCoord(lat, lng)) return { lat, lng }
  }

  // Compact DMS: 41°43'17.2"N 44°46'12.5"E
  const compactPattern =
    /(\d+)[°]\s*(\d+)['']\s*([\d.]+)[""]([NS])\s+(\d+)[°]\s*(\d+)['']\s*([\d.]+)[""]([EW])/
  const compactMatch = text.match(compactPattern)
  if (compactMatch) {
    const lat = dmsToDecimal(
      Number(compactMatch[1]),
      Number(compactMatch[2]),
      Number(compactMatch[3]),
      compactMatch[4]
    )
    const lng = dmsToDecimal(
      Number(compactMatch[5]),
      Number(compactMatch[6]),
      Number(compactMatch[7]),
      compactMatch[8]
    )
    if (isValidCoord(lat, lng)) return { lat, lng }
  }

  return null
}

function extractDecimalPair(text: string): { lat: number; lng: number } | null {
  // "41.7151, 44.8271" or "41.7151,44.8271" — optionally followed by anything
  const commaMatch = text.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/)
  if (commaMatch) {
    const lat = Number(commaMatch[1])
    const lng = Number(commaMatch[2])
    if (isValidCoord(lat, lng)) return { lat, lng }
  }

  // Space-separated: "41.430795 45.101454"
  const spaceMatch = text.match(/^(-?\d+\.\d+)\s+(-?\d+\.\d+)$/)
  if (spaceMatch) {
    const lat = Number(spaceMatch[1])
    const lng = Number(spaceMatch[2])
    if (isValidCoord(lat, lng)) return { lat, lng }
  }

  return null
}

export function parseCoordinates(value: unknown): { lat: number; lng: number } | null {
  if (!value) return null

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>
    if (obj.lat != null && obj.lng != null) {
      const lat = Number(obj.lat)
      const lng = Number(obj.lng)
      if (isValidCoord(lat, lng)) return { lat, lng }
    }
    return null
  }

  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!text) return null

  // 1. Google Maps URL with decimal coords (covers ~85%)
  const fromUrl = extractFromGoogleUrl(text)
  if (fromUrl) return fromUrl

  // 2. DMS format — Latitude: N 41°43'... Longitude: E 44°47'... (covers ~11%)
  const fromDms = extractFromDms(text)
  if (fromDms) return fromDms

  // 3. Decimal pair — "41.7151, 44.8271" or "41.43 45.10" (covers ~2%)
  const fromDecimal = extractDecimalPair(text)
  if (fromDecimal) return fromDecimal

  // 4. Short links (maps.app.goo.gl) — no coords in URL, can't parse client-side
  return null
}
