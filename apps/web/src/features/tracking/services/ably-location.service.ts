import { getAblyClient, isAblyAvailable } from '@/lib/ably'

export interface LocationUpdate {
  inspector_id: string
  latitude: number
  longitude: number
  accuracy?: number
  speed?: number
  heading?: number
  route_id?: string
  timestamp: string
}

export const ablyLocationService = {
  subscribeToInspector(
    inspectorId: string,
    onUpdate: (location: LocationUpdate) => void
  ) {
    const ably = getAblyClient()
    if (!ably) return { unsubscribe: () => {} }

    const channelName = `location:inspector:${inspectorId}`
    const channel = ably.channels.get(channelName)

    channel.subscribe('location', (message: any) => {
      onUpdate(message.data as LocationUpdate)
    })

    return {
      unsubscribe: () => {
        channel.unsubscribe()
      },
    }
  },

  subscribeToAllInspectors(
    inspectorIds: string[],
    onUpdate: (location: LocationUpdate) => void
  ) {
    const subscriptions = inspectorIds.map(id =>
      this.subscribeToInspector(id, onUpdate)
    )

    return {
      unsubscribe: () => {
        subscriptions.forEach(sub => sub.unsubscribe())
      },
    }
  },

  isAvailable: isAblyAvailable,
}
