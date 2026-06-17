import { createClient } from '@/lib/supabase'

const getSupabase = () => createClient()

export interface MyWorkItem {
  item_id: string
  item_name: string
  board_id: string
  board_name: string
  board_icon: string | null
  board_color: string | null
  group_id: string | null
  group_name: string | null
  group_color: string | null
  item_data: Record<string, any>
  item_status: string | null
  item_due_date: string | null
  item_position: number
  item_created_at: string
  item_updated_at: string
  person_column_ids: string[]
  date_column_id: string | null
}

export const myWorkService = {
  async getMyWorkItems(userId: string): Promise<MyWorkItem[]> {
    const { data, error } = await (getSupabase().rpc as any)('get_my_work_items', {
      p_user_id: userId,
    })
    if (error) throw error
    return (data || []) as MyWorkItem[]
  },

  async updateItemStatus(itemId: string, status: string): Promise<void> {
    const { error } = await getSupabase().from('board_items').update({ status }).eq('id', itemId)
    if (error) throw error
  },

  async updateItemDate(
    itemId: string,
    dateColumnId: string | null,
    date: string | null
  ): Promise<void> {
    if (dateColumnId) {
      const { data: item, error: fetchError } = await getSupabase()
        .from('board_items')
        .select('data')
        .eq('id', itemId)
        .single()
      if (fetchError) throw fetchError

      const existingData = (item?.data ?? {}) as Record<string, any>
      const newData = { ...existingData, [dateColumnId]: date }
      const { error } = await getSupabase()
        .from('board_items')
        .update({ data: newData })
        .eq('id', itemId)
      if (error) throw error
    } else {
      const { error } = await getSupabase()
        .from('board_items')
        .update({ due_date: date })
        .eq('id', itemId)
      if (error) throw error
    }
  },
}
