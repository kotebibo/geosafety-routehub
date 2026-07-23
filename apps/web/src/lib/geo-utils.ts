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

// TEMP (stage test data): the check-in geofence is bumped to 150 KM so seeded
// test check-ins pass from anywhere while we load test data. It's env-overridable
// so real config wins; to restore the real 150 m rule, set
// CHECKIN_RADIUS_METERS=150 in env (or change the fallback back to 150).
export const CHECKIN_RADIUS_METERS = Number(process.env.CHECKIN_RADIUS_METERS) || 150_000

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

// A checkin column can target multiple coordinates (e.g. a site with several
// gates/buildings). The inspector may check in from the radius of ANY of them,
// so we geofence against the nearest target. Returns null when there are no
// targets (GPS-only mode).
export function nearestWithinRadius(
  lat: number,
  lng: number,
  targets: Array<{ lat: number; lng: number }>,
  accuracyMeters: number | null | undefined,
  radiusMeters: number
): { distance: number; within: boolean; target: { lat: number; lng: number } } | null {
  if (targets.length === 0) return null
  let best: { distance: number; target: { lat: number; lng: number } } | null = null
  for (const t of targets) {
    const distance = Math.round(haversineMeters(lat, lng, t.lat, t.lng))
    if (!best || distance < best.distance) best = { distance, target: t }
  }
  return {
    distance: best!.distance,
    within: isWithinRadius(best!.distance, accuracyMeters, radiusMeters),
    target: best!.target,
  }
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

// Matched globally — several map links pasted on ONE line ("url1 url2") each
// contribute a point instead of only the first winning. query= pins win over
// @-style map centers: a full share URL carries both for the same place, and
// its @ center would otherwise add a phantom second point a few meters off.
function extractFromGoogleUrls(text: string): Array<{ lat: number; lng: number }> {
  const collect = (re: RegExp): Array<{ lat: number; lng: number }> => {
    const out: Array<{ lat: number; lng: number }> = []
    for (const m of text.matchAll(re)) {
      const lat = Number(m[1])
      const lng = Number(m[2])
      if (isValidCoord(lat, lng)) out.push({ lat, lng })
    }
    return out
  }

  // query=LAT,LNG (most common — 85% of entries)
  const fromQuery = collect(/query=(-?\d+\.?\d*),(-?\d+\.?\d*)/g)
  if (fromQuery.length > 0) return fromQuery

  // @LAT,LNG in maps URL path
  // maps/place/LAT%C2%B0... encoded DMS — the query= param above catches these too,
  // but if someone pastes a place URL without query=, fall through to DMS parsing
  return collect(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/g)
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

function extractAllDecimalPairs(text: string): Array<{ lat: number; lng: number }> {
  const out: Array<{ lat: number; lng: number }> = []

  // Comma-joined pairs, matched globally — so several pairs separated by spaces
  // on one line ("41.71, 44.82  41.72, 44.81") are EACH captured, not just the
  // first. Both numbers must carry a decimal point, which keeps a trailing map
  // zoom like "…,15z" from being mistaken for a coordinate.
  for (const m of text.matchAll(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/g)) {
    const lat = Number(m[1])
    const lng = Number(m[2])
    if (isValidCoord(lat, lng)) out.push({ lat, lng })
  }
  if (out.length > 0) return out

  // No comma pair — accept a single space-separated pair: "41.430795 45.101454"
  const spaceMatch = text.trim().match(/^(-?\d+\.\d+)\s+(-?\d+\.\d+)$/)
  if (spaceMatch) {
    const lat = Number(spaceMatch[1])
    const lng = Number(spaceMatch[2])
    if (isValidCoord(lat, lng)) out.push({ lat, lng })
  }

  return out
}

function parseObjectCoord(value: unknown): { lat: number; lng: number } | null {
  if (value == null || typeof value !== 'object') return null
  const obj = value as Record<string, unknown>
  if (obj.lat == null || obj.lng == null) return null
  const lat = Number(obj.lat)
  const lng = Number(obj.lng)
  return isValidCoord(lat, lng) ? { lat, lng } : null
}

// Every coordinate in a single entry (one line, or one `;`-delimited chunk). A
// URL or DMS entry resolves to one point; a bare decimal entry may yield several
// (multiple space-separated "lat, lng" pairs). Checking URL/DMS first means a
// location written as "DMS block + its query= URL" isn't counted twice.
function parseEntryCoordinates(entry: string): Array<{ lat: number; lng: number }> {
  const text = entry.trim()
  if (!text) return []

  // Google Maps URL(s) with decimal coords (covers ~85%) — all links in the
  // entry count, so two URLs on one line yield two points
  const fromUrls = extractFromGoogleUrls(text)
  if (fromUrls.length > 0) return fromUrls

  // DMS — Latitude: N 41°43'... Longitude: E 44°47'... (covers ~11%)
  const fromDms = extractFromDms(text)
  if (fromDms) return [fromDms]

  // Decimal pair(s) — "41.7151, 44.8271" / "41.43 45.10" / several per line
  return extractAllDecimalPairs(text)
}

function dedupeCoords(
  list: Array<{ lat: number; lng: number } | null>
): Array<{ lat: number; lng: number }> {
  const seen = new Set<string>()
  const out: Array<{ lat: number; lng: number }> = []
  for (const c of list) {
    if (!c) continue
    // ~1m precision — two entries describing the same spot (e.g. a DMS block and
    // its query= URL) collapse to one target instead of a phantom second point.
    const key = `${c.lat.toFixed(5)},${c.lng.toFixed(5)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(c)
  }
  return out
}

// Parse ALL coordinates from a coordinates-column cell. Entries are split on
// newlines / `;`, and each entry can itself contribute several points (multiple
// space-separated decimal pairs on one line). Within an entry a URL or DMS block
// wins over a bare pair, so a single location written in two notations isn't
// double-counted. Returns [] for GPS-only / unparseable cells.
export function parseCoordinatesList(value: unknown): Array<{ lat: number; lng: number }> {
  if (!value) return []

  if (Array.isArray(value)) {
    const out: Array<{ lat: number; lng: number }> = []
    for (const item of value) {
      const obj = parseObjectCoord(item)
      if (obj) out.push(obj)
      else if (typeof item === 'string') out.push(...parseEntryCoordinates(item))
    }
    return dedupeCoords(out)
  }

  if (typeof value === 'object') {
    const obj = parseObjectCoord(value)
    return obj ? [obj] : []
  }

  if (typeof value !== 'string') return []
  const text = value.trim()
  if (!text) return []

  const out: Array<{ lat: number; lng: number }> = []
  for (const entry of text.split(/[\n;]+/)) {
    out.push(...parseEntryCoordinates(entry))
  }
  // Safety net: an entry that spans lines (Latitude and Longitude on separate
  // lines) yields nothing per-line — retry DMS against the whole string.
  if (out.length === 0) {
    const whole = extractFromDms(text)
    if (whole) out.push(whole)
  }

  return dedupeCoords(out)
}

export function parseCoordinates(value: unknown): { lat: number; lng: number } | null {
  return parseCoordinatesList(value)[0] ?? null
}
