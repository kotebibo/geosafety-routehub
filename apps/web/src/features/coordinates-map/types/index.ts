export interface CoordinateItem {
  id: string
  name: string
  inspector: string
  lat: number
  lng: number
  coordinates: string
  sk: string
  address: string
  addressLat: number | null
  addressLng: number | null
  distanceKm: number | null
}
