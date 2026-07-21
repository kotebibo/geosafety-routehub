import { describe, it, expect } from 'vitest'
import {
  detectCoordinatesColumn,
  detectSkColumn,
  expandBoardItems,
  type BoardColumnMeta,
} from '@/features/coordinates-map/lib/points'

function col(overrides: Partial<BoardColumnMeta>): BoardColumnMeta {
  return {
    board_id: 'b1',
    column_id: 'c1',
    column_name: null,
    column_name_ka: null,
    column_type: 'text',
    config: null,
    ...overrides,
  }
}

describe('detectCoordinatesColumn', () => {
  it('prefers a checkin column config over a name match', () => {
    const columns = [
      col({ column_id: 'named', column_name: 'კოორდინატები' }),
      col({
        column_id: 'chk',
        column_type: 'checkin',
        config: { coordinates_column_id: 'target' },
      }),
    ]
    expect(detectCoordinatesColumn(columns)).toBe('target')
  })

  it('ignores checkin columns without coordinates_column_id', () => {
    const columns = [
      col({ column_id: 'chk', column_type: 'checkin', config: {} }),
      col({ column_id: 'named', column_name: 'კოორდინატები' }),
    ]
    expect(detectCoordinatesColumn(columns)).toBe('named')
  })

  it('matches by column_name in Georgian', () => {
    expect(detectCoordinatesColumn([col({ column_id: 'x', column_name: 'კოორდინატები' })])).toBe(
      'x'
    )
  })

  it('matches the common misspelling კორდინატ', () => {
    expect(detectCoordinatesColumn([col({ column_id: 'x', column_name: 'კორდინატები' })])).toBe('x')
  })

  it('matches by column_name_ka', () => {
    expect(detectCoordinatesColumn([col({ column_id: 'x', column_name_ka: 'კოორდინატი' })])).toBe(
      'x'
    )
  })

  it('matches English "Coordinates"', () => {
    expect(detectCoordinatesColumn([col({ column_id: 'x', column_name: 'Coordinates' })])).toBe('x')
  })

  it('falls back to a location-type column', () => {
    const columns = [
      col({ column_id: 'a', column_name: 'მისამართი' }),
      col({ column_id: 'loc', column_type: 'location', column_name: 'ადგილი' }),
    ]
    expect(detectCoordinatesColumn(columns)).toBe('loc')
  })

  it('returns null when nothing matches', () => {
    expect(detectCoordinatesColumn([col({ column_name: 'სახელი' })])).toBeNull()
    expect(detectCoordinatesColumn([])).toBeNull()
  })
})

describe('detectSkColumn', () => {
  it('matches ს/კ', () => {
    expect(detectSkColumn([col({ column_id: 'sk', column_name: 'ს/კ' })])).toBe('sk')
  })

  it('matches საიდენტიფიკაციო კოდი', () => {
    expect(detectSkColumn([col({ column_id: 'sk', column_name: 'საიდენტიფიკაციო კოდი' })])).toBe(
      'sk'
    )
  })

  it('returns null otherwise', () => {
    expect(detectSkColumn([col({ column_name: 'კოორდინატები' })])).toBeNull()
  })
})

describe('expandBoardItems', () => {
  const columns = [
    col({ column_id: 'coords', column_name: 'კოორდინატები' }),
    col({ column_id: 'sk', column_name: 'ს/კ' }),
  ]

  it('expands a multi-coordinate cell into one item with several points', () => {
    const items = [
      {
        id: 'item1',
        board_id: 'b1',
        name: 'შპს კომპანია',
        data: {
          coords:
            'https://www.google.com/maps?q=41.7151,44.8271\nhttps://www.google.com/maps?q=41.7300,44.8000',
          sk: '404404404',
        },
      },
    ]
    const result = expandBoardItems('გიორგი უგლავა', columns, items)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'item1',
      name: 'შპს კომპანია',
      inspector: 'გიორგი უგლავა',
      sk: '404404404',
    })
    expect(result[0].points).toHaveLength(2)
    expect(result[0].points[0]).toEqual({ id: 'item1:0', lat: 41.7151, lng: 44.8271, index: 0 })
    expect(result[0].points[1]).toEqual({ id: 'item1:1', lat: 41.73, lng: 44.8, index: 1 })
  })

  it('parses a plain decimal pair', () => {
    const items = [{ id: 'i', board_id: 'b1', name: 'X', data: { coords: '41.7151, 44.8271' } }]
    const result = expandBoardItems('ინსპ', columns, items)
    expect(result[0].points).toEqual([{ id: 'i:0', lat: 41.7151, lng: 44.8271, index: 0 }])
  })

  it('drops items with empty or unparseable cells', () => {
    const items = [
      { id: 'a', board_id: 'b1', name: 'A', data: { coords: '' } },
      { id: 'b', board_id: 'b1', name: 'B', data: { coords: 'no coords here' } },
      { id: 'c', board_id: 'b1', name: 'C', data: null },
    ]
    expect(expandBoardItems('ინსპ', columns, items)).toHaveLength(0)
  })

  it('returns empty sk when no sk column exists', () => {
    const coordsOnly = [col({ column_id: 'coords', column_name: 'კოორდინატები' })]
    const items = [
      { id: 'i', board_id: 'b1', name: 'X', data: { coords: '41.7, 44.8', sk: 'ignored' } },
    ]
    expect(expandBoardItems('ინსპ', coordsOnly, items)[0].sk).toBe('')
  })

  it('returns [] for a board with no detectable coordinates column', () => {
    const noCoords = [col({ column_id: 'other', column_name: 'სახელი' })]
    const items = [{ id: 'i', board_id: 'b1', name: 'X', data: { other: '41.7, 44.8' } }]
    expect(expandBoardItems('ინსპ', noCoords, items)).toHaveLength(0)
  })

  it('normalizes a null item name to empty string', () => {
    const items = [{ id: 'i', board_id: 'b1', name: null, data: { coords: '41.7, 44.8' } }]
    expect(expandBoardItems('ინსპ', columns, items)[0].name).toBe('')
  })
})
