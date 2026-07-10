'use client'

import { useState } from 'react'

import { activityService } from '@/features/boards/services/activity.service'

import type { ItemUpdate } from '@/types/board'

interface UseActivityOptions {
  itemId: string
  itemType: string
}

export function useActivity({ itemId, itemType }: UseActivityOptions) {
  const [activities, setActivities] = useState<ItemUpdate[]>([])
  const [activityLoading, setActivityLoading] = useState(false)

  const loadActivity = async () => {
    if (!itemId) return
    setActivityLoading(true)
    try {
      const data = await activityService.getItemUpdates(itemType, itemId)
      setActivities(data)
    } catch (error) {
      console.error('Error loading activity:', error)
    } finally {
      setActivityLoading(false)
    }
  }

  return { activities, activityLoading, loadActivity }
}
