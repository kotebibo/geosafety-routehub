import { getSupabase } from '@/lib/supabase'
import type { CoordinateItem } from '@/features/coordinates-map/types'

const BOARD_NAME = 'კოორდინატები - ინსპექტორები'

let cachedBoardId: string | null = null

export const coordinatesMapService = {
  async getBoardId(): Promise<string | null> {
    if (cachedBoardId) return cachedBoardId

    const { data, error } = await getSupabase()
      .from('boards')
      .select('id')
      .eq('name', BOARD_NAME)
      .single()

    if (error) throw error
    cachedBoardId = data?.id ?? null
    return cachedBoardId
  },

  async getCoordinateItems(): Promise<CoordinateItem[]> {
    const boardId = await this.getBoardId()
    if (!boardId) return []

    const { data, error } = await getSupabase()
      .from('board_items')
      .select('id, name, data')
      .eq('board_id', boardId)
      .is('deleted_at', null)
      .order('position', { ascending: true })

    if (error) throw error

    return (data || [])
      .map(item => {
        const d = item.data as Record<string, string> | null
        const lat = parseFloat(d?.lat || '')
        const lng = parseFloat(d?.lng || '')

        if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return null

        return {
          id: item.id,
          name: item.name || '',
          inspector: d?.inspector || '',
          lat,
          lng,
          coordinates: d?.coordinates || '',
          sk: d?.sk || '',
        }
      })
      .filter((item): item is CoordinateItem => item !== null)
  },
}
