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

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}წთ`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}სთ ${m}წთ` : `${h}სთ`
}

export function formatElapsed(startTime: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000))
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  const s = diff % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export function parseCoordinates(value: unknown): { lat: number; lng: number } | null {
  if (!value) return null

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>
    if (obj.lat != null && obj.lng != null) {
      const lat = Number(obj.lat)
      const lng = Number(obj.lng)
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng }
      }
    }
    return null
  }

  if (typeof value === 'string') {
    const parts = value.split(',').map(s => s.trim())
    if (parts.length === 2) {
      const lat = Number(parts[0])
      const lng = Number(parts[1])
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng }
      }
    }
  }

  return null
}
