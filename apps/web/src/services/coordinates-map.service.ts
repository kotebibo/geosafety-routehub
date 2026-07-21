import { getSupabase } from '@/lib/supabase'
import {
  expandBoardItems,
  type BoardColumnMeta,
  type RawBoardItem,
} from '@/features/coordinates-map/lib/points'
import type { CoordinateItem } from '@/features/coordinates-map/types'

// Instance-specific (only some instances have this workspace) — env-overridable.
// Must stay a literal process.env.NEXT_PUBLIC_* expression so Next.js inlines
// it into the client bundle.
const SPECIALISTS_WORKSPACE_NAME =
  process.env.NEXT_PUBLIC_SPECIALISTS_WORKSPACE_NAME || 'სპეციალისტები'

const BOARD_ID_CHUNK = 40
const ITEMS_PAGE_SIZE = 1000

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function fetchItemsForBoards(boardIds: string[]): Promise<RawBoardItem[]> {
  const items: RawBoardItem[] = []
  let from = 0
  // PostgREST caps responses at 1000 rows; page until a short page arrives.
  // Deterministic ordering is required for stable .range() paging.
  for (;;) {
    const { data, error } = await getSupabase()
      .from('board_items')
      .select('id, board_id, name, data')
      .in('board_id', boardIds)
      .is('deleted_at', null)
      .order('board_id', { ascending: true })
      .order('position', { ascending: true })
      .range(from, from + ITEMS_PAGE_SIZE - 1)

    if (error) throw error
    items.push(...((data || []) as RawBoardItem[]))
    if (!data || data.length < ITEMS_PAGE_SIZE) break
    from += ITEMS_PAGE_SIZE
  }
  return items
}

export const coordinatesMapService = {
  async getSpecialistsWorkspaceId(): Promise<string | null> {
    const { data, error } = await getSupabase()
      .from('workspaces')
      .select('id')
      .eq('name', SPECIALISTS_WORKSPACE_NAME)
      .limit(1)

    if (error) throw error
    return data?.[0]?.id ?? null
  },

  async getCoordinateItems(): Promise<CoordinateItem[]> {
    const workspaceId = await this.getSpecialistsWorkspaceId()
    // Instance without the workspace → empty map, not an error
    if (!workspaceId) return []

    const { data: boards, error: boardsError } = await getSupabase()
      .from('boards')
      .select('id, name')
      .eq('workspace_id', workspaceId)

    if (boardsError) throw boardsError
    if (!boards || boards.length === 0) return []

    const idChunks = chunk(
      boards.map(b => b.id as string),
      BOARD_ID_CHUNK
    )

    const [columnChunks, itemChunks] = await Promise.all([
      Promise.all(
        idChunks.map(async ids => {
          const { data, error } = await getSupabase()
            .from('board_columns')
            .select('board_id, column_id, column_name, column_name_ka, column_type, config')
            .in('board_id', ids)
          if (error) throw error
          return (data || []) as BoardColumnMeta[]
        })
      ),
      Promise.all(idChunks.map(ids => fetchItemsForBoards(ids))),
    ])

    const columnsByBoard = new Map<string, BoardColumnMeta[]>()
    for (const col of columnChunks.flat()) {
      const list = columnsByBoard.get(col.board_id) || []
      list.push(col)
      columnsByBoard.set(col.board_id, list)
    }

    const itemsByBoard = new Map<string, RawBoardItem[]>()
    for (const item of itemChunks.flat()) {
      const list = itemsByBoard.get(item.board_id) || []
      list.push(item)
      itemsByBoard.set(item.board_id, list)
    }

    return boards
      .flatMap(b =>
        expandBoardItems(
          (b.name as string) || '',
          columnsByBoard.get(b.id as string) || [],
          itemsByBoard.get(b.id as string) || []
        )
      )
      .sort(
        (a, b) => a.inspector.localeCompare(b.inspector, 'ka') || a.name.localeCompare(b.name, 'ka')
      )
  },
}
