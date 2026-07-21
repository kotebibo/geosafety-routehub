import { parseCoordinatesList } from '@/lib/geo-utils'
import type { CoordinateItem } from '../types'

export interface BoardColumnMeta {
  board_id: string
  column_id: string
  column_name: string | null
  column_name_ka: string | null
  column_type: string
  config: Record<string, unknown> | null
}

export interface RawBoardItem {
  id: string
  board_id: string
  name: string | null
  data: Record<string, unknown> | null
}

// კორდინატ covers a common misspelling seen in real board columns
const COORD_NAME_RE = /კოორდინატ|კორდინატ|coordinat/i
const SK_NAME_RE = /ს\/კ|საიდენტ/i

function nameMatches(column: BoardColumnMeta, re: RegExp): boolean {
  return re.test(column.column_name || '') || re.test(column.column_name_ka || '')
}

// Column IDs differ per board and per instance, so the coordinates column is
// detected at runtime. Priority: a checkin column's config already points at
// it; otherwise match by column name; otherwise fall back to the location type.
export function detectCoordinatesColumn(columns: BoardColumnMeta[]): string | null {
  for (const col of columns) {
    if (col.column_type === 'checkin' && typeof col.config?.coordinates_column_id === 'string') {
      return col.config.coordinates_column_id
    }
  }

  const byName = columns.find(c => nameMatches(c, COORD_NAME_RE))
  if (byName) return byName.column_id

  const byType = columns.find(c => c.column_type === 'location')
  return byType ? byType.column_id : null
}

export function detectSkColumn(columns: BoardColumnMeta[]): string | null {
  const col = columns.find(c => nameMatches(c, SK_NAME_RE))
  return col ? col.column_id : null
}

// One board's worth of data → CoordinateItem[]: one item per board item, one
// point per parsed coordinate. Items whose cell yields no points are dropped.
export function expandBoardItems(
  boardName: string,
  columns: BoardColumnMeta[],
  items: RawBoardItem[]
): CoordinateItem[] {
  const coordColId = detectCoordinatesColumn(columns)
  if (!coordColId) return []

  const skColId = detectSkColumn(columns)

  const result: CoordinateItem[] = []
  for (const item of items) {
    const coords = parseCoordinatesList(item.data?.[coordColId])
    if (coords.length === 0) continue

    result.push({
      id: item.id,
      name: item.name || '',
      inspector: boardName,
      sk: skColId ? String(item.data?.[skColId] ?? '') : '',
      points: coords.map((c, i) => ({
        id: `${item.id}:${i}`,
        lat: c.lat,
        lng: c.lng,
        index: i,
      })),
    })
  }
  return result
}
