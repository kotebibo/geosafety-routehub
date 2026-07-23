// Build a Google Maps driving-directions URL through an ordered list of points
// (e.g. home → objects → home). Returns null if there aren't at least two
// points. Works in browser and the Google Maps mobile app.
export function googleMapsDirUrl(points: Array<{ lat: number; lng: number }>): string | null {
  if (points.length < 2) return null
  const p = points.map(x => `${x.lat},${x.lng}`)
  const params = new URLSearchParams({
    api: '1',
    origin: p[0],
    destination: p[p.length - 1],
    travelmode: 'driving',
  })
  const waypoints = p.slice(1, -1).join('|')
  if (waypoints) params.set('waypoints', waypoints)
  return `https://www.google.com/maps/dir/?${params.toString()}`
}
