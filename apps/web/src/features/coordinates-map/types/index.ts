export interface CoordinatePoint {
  id: string // `${itemId}:${index}` — stable marker key
  lat: number
  lng: number
  index: number // 0-based position within the item's coordinates cell
}

export interface CoordinateItem {
  id: string // board_items.id
  name: string // item name = company name
  inspector: string // board name = inspector name
  sk: string // value of a detected ს/კ column, else ''
  points: CoordinatePoint[] // length >= 1 — zero-point items are dropped
}
