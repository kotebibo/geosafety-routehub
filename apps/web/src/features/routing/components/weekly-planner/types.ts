export interface DayResult {
  /** company item ids in optimized order */
  order: string[]
  /** full loop distance: home → stops → home */
  km: number
  /** the last-stop → home leg */
  returnKm?: number
  stops: { itemId: string; distanceFromPrevious: number }[]
  /** [lng, lat] pairs from OSRM for the real-road map line (when optimized) */
  geometry?: number[][]
}

/** An ad-hoc extra visit — its own home→object route, numbered in add order. */
export interface ExtraVisit {
  itemId: string
  name: string
  km: number | null
  loading: boolean
}
