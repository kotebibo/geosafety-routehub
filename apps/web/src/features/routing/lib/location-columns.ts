import type { BoardColumn } from '@/types/board'

export interface LocationColumns {
  /** Column whose value holds/should hold "lat, lng" (may be empty on items). */
  coordsColumnId?: string
  /** Text column holding a street address, geocodable into coordinates. */
  addressColumnId?: string
}

/**
 * Figures out which columns a board uses for location, WITHOUT requiring a
 * check-in column. Coordinates are optional per board — a board is routable
 * only if it has a coordinates column (with data or a geocodable address).
 *
 * Detection order:
 *  - coords: the check-in column's `coordinates_column_id` (explicit), else a
 *    column named/ided like coordinates.
 *  - address: the check-in column's `address_column_id` (explicit), else a text
 *    column named like an address.
 */
export function resolveLocationColumns(columns: BoardColumn[]): LocationColumns {
  const checkin = columns.find(c => c.column_type === 'checkin')
  const cfg = (checkin?.config ?? {}) as Record<string, any>

  const coordsColumnId =
    (cfg.coordinates_column_id as string | undefined) ||
    columns.find(
      c => c.column_id === 'coordinates' || /კოორდინატ|coordinate|coords/i.test(c.column_name)
    )?.column_id

  const addressColumnId =
    (cfg.address_column_id as string | undefined) ||
    columns.find(c => c.column_type === 'text' && /მისამარ|address|მის\./i.test(c.column_name))
      ?.column_id

  return { coordsColumnId, addressColumnId }
}
