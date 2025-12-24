# Real-time Systems Improvement Plan

## Overview
Enhance the Ably-based real-time collaboration system for better reliability, performance, and user experience across the board system and future features.

## Current State Analysis

### Strengths
- Lazy-loaded Ably client (~300KB deferred)
- Presence tracking with editing indicators
- Item change broadcasting via pub/sub
- Fallback to polling when Ably unavailable
- Connection ID-based self-filtering

### Pain Points
- No reconnection strategy for network interruptions
- Missing conflict resolution for concurrent edits
- No message queuing for offline scenarios
- Limited error recovery
- No typing indicators or cursor sharing
- Missing presence history/analytics

## Improvement Areas

### 1. Connection Management

#### 1.1 Robust Reconnection Strategy
```typescript
// lib/ably/connection-manager.ts
interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'suspended' | 'failed'
  retryCount: number
  lastConnected: Date | null
  error: string | null
}

class AblyConnectionManager {
  private client: Ably.Realtime | null = null
  private state: ConnectionState = {
    status: 'disconnected',
    retryCount: 0,
    lastConnected: null,
    error: null,
  }
  private listeners = new Set<(state: ConnectionState) => void>()

  async connect(userId: string): Promise<void> {
    const apiKey = getAblyApiKey()
    if (!apiKey) throw new Error('Ably API key not configured')

    await loadAbly()

    this.client = new Ably.Realtime({
      key: apiKey,
      clientId: userId,
      echoMessages: false,
      // Connection recovery
      recover: (lastConnectionDetails, cb) => {
        // Attempt to recover within 2 minutes
        if (Date.now() - lastConnectionDetails.disconnectedAt < 120000) {
          cb(true)
        } else {
          cb(false)
        }
      },
      // Automatic reconnection
      disconnectedRetryTimeout: 5000,
      suspendedRetryTimeout: 15000,
    })

    this.setupConnectionListeners()
  }

  private setupConnectionListeners(): void {
    if (!this.client) return

    this.client.connection.on('connected', () => {
      this.updateState({
        status: 'connected',
        retryCount: 0,
        lastConnected: new Date(),
        error: null,
      })
    })

    this.client.connection.on('disconnected', () => {
      this.updateState({ status: 'disconnected' })
    })

    this.client.connection.on('suspended', () => {
      this.updateState({ status: 'suspended' })
    })

    this.client.connection.on('failed', (stateChange) => {
      this.updateState({
        status: 'failed',
        error: stateChange.reason?.message || 'Connection failed',
      })
    })
  }

  private updateState(partial: Partial<ConnectionState>): void {
    this.state = { ...this.state, ...partial }
    this.listeners.forEach(cb => cb(this.state))
  }

  subscribe(callback: (state: ConnectionState) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  getClient(): Ably.Realtime | null {
    return this.client
  }
}

export const connectionManager = new AblyConnectionManager()
```

#### 1.2 React Hook for Connection State
```typescript
// hooks/useAblyConnection.ts
export function useAblyConnection() {
  const [state, setState] = useState<ConnectionState>({
    status: 'disconnected',
    retryCount: 0,
    lastConnected: null,
    error: null,
  })

  useEffect(() => {
    return connectionManager.subscribe(setState)
  }, [])

  return {
    ...state,
    isOnline: state.status === 'connected',
    isReconnecting: state.status === 'disconnected' || state.status === 'suspended',
  }
}
```

### 2. Message Queuing & Offline Support

#### 2.1 Offline Message Queue
```typescript
// lib/ably/message-queue.ts
interface QueuedMessage {
  id: string
  channel: string
  event: string
  data: unknown
  timestamp: number
  retries: number
}

class MessageQueue {
  private queue: QueuedMessage[] = []
  private processing = false
  private maxRetries = 3

  // Persist to localStorage for page refresh recovery
  private persist(): void {
    localStorage.setItem('ably_message_queue', JSON.stringify(this.queue))
  }

  private restore(): void {
    const stored = localStorage.getItem('ably_message_queue')
    if (stored) {
      this.queue = JSON.parse(stored)
    }
  }

  enqueue(channel: string, event: string, data: unknown): string {
    const message: QueuedMessage = {
      id: crypto.randomUUID(),
      channel,
      event,
      data,
      timestamp: Date.now(),
      retries: 0,
    }

    this.queue.push(message)
    this.persist()
    this.processQueue()

    return message.id
  }

  async processQueue(): Promise<void> {
    if (this.processing) return
    if (connectionManager.getClient()?.connection.state !== 'connected') return

    this.processing = true

    while (this.queue.length > 0) {
      const message = this.queue[0]

      try {
        const client = connectionManager.getClient()
        if (!client) break

        const channel = client.channels.get(message.channel)
        await channel.publish(message.event, message.data)

        // Success - remove from queue
        this.queue.shift()
        this.persist()
      } catch (error) {
        message.retries++

        if (message.retries >= this.maxRetries) {
          // Give up on this message
          this.queue.shift()
          console.error('Message failed after max retries:', message)
        }

        break // Stop processing, wait for retry
      }
    }

    this.processing = false
  }
}

export const messageQueue = new MessageQueue()
```

#### 2.2 Optimistic Updates with Rollback
```typescript
// services/realtime-mutation.ts
interface OptimisticUpdate<T> {
  id: string
  timestamp: number
  type: 'insert' | 'update' | 'delete'
  data: T
  rollbackData?: T
}

class RealtimeMutationService {
  private pendingUpdates = new Map<string, OptimisticUpdate<unknown>>()

  async mutateWithOptimism<T>(
    queryKey: QueryKey,
    mutation: () => Promise<T>,
    optimisticData: T,
    rollbackData?: T
  ): Promise<T> {
    const updateId = crypto.randomUUID()

    // Track the optimistic update
    this.pendingUpdates.set(updateId, {
      id: updateId,
      timestamp: Date.now(),
      type: 'update',
      data: optimisticData,
      rollbackData,
    })

    // Apply optimistically
    queryClient.setQueryData(queryKey, (old: T) => ({
      ...old,
      ...optimisticData,
    }))

    try {
      const result = await mutation()
      this.pendingUpdates.delete(updateId)
      return result
    } catch (error) {
      // Rollback
      if (rollbackData) {
        queryClient.setQueryData(queryKey, rollbackData)
      } else {
        queryClient.invalidateQueries({ queryKey })
      }
      this.pendingUpdates.delete(updateId)
      throw error
    }
  }
}
```

### 3. Conflict Resolution

#### 3.1 Last-Write-Wins with Timestamps
```typescript
// lib/ably/conflict-resolution.ts
interface VersionedData<T> {
  data: T
  version: number
  timestamp: number
  updatedBy: string
}

class ConflictResolver<T> {
  resolve(
    local: VersionedData<T>,
    remote: VersionedData<T>
  ): { winner: VersionedData<T>; hasConflict: boolean } {
    // If versions are different, use the higher version
    if (local.version !== remote.version) {
      return {
        winner: local.version > remote.version ? local : remote,
        hasConflict: true,
      }
    }

    // Same version - use timestamp (last write wins)
    return {
      winner: local.timestamp > remote.timestamp ? local : remote,
      hasConflict: true,
    }
  }
}
```

#### 3.2 Operational Transform for Text Fields
```typescript
// lib/ably/operational-transform.ts
interface TextOperation {
  type: 'insert' | 'delete' | 'retain'
  position: number
  text?: string
  count?: number
}

class TextOT {
  transform(op1: TextOperation, op2: TextOperation): TextOperation {
    // Transform op1 against op2
    if (op1.type === 'insert' && op2.type === 'insert') {
      if (op1.position <= op2.position) {
        return { ...op2, position: op2.position + (op1.text?.length || 0) }
      }
      return op2
    }

    if (op1.type === 'delete' && op2.type === 'insert') {
      if (op1.position < op2.position) {
        return { ...op2, position: op2.position - (op1.count || 0) }
      }
      return op2
    }

    // ... more transformations
    return op2
  }

  compose(ops: TextOperation[]): TextOperation[] {
    // Combine multiple operations into minimal set
    return ops.reduce((composed, op) => {
      // Composition logic
      return [...composed, op]
    }, [] as TextOperation[])
  }
}
```

### 4. Enhanced Presence Features

#### 4.1 Cursor Sharing
```typescript
// services/cursor-presence.service.ts
interface CursorPosition {
  userId: string
  userName: string
  userColor: string
  x: number
  y: number
  itemId?: string
  columnId?: string
  timestamp: number
}

class CursorPresenceService {
  private channel: Ably.RealtimeChannel | null = null
  private cursors = new Map<string, CursorPosition>()
  private throttledUpdate: ReturnType<typeof throttle>

  constructor() {
    // Throttle cursor updates to 50ms
    this.throttledUpdate = throttle(this.publishCursor.bind(this), 50)
  }

  attachToBoard(boardId: string, userId: string, userName: string): void {
    const client = connectionManager.getClient()
    if (!client) return

    this.channel = client.channels.get(`cursors:${boardId}`)

    this.channel.subscribe('cursor:move', (message) => {
      const cursor = message.data as CursorPosition
      if (cursor.userId !== userId) {
        this.cursors.set(cursor.userId, cursor)
        this.notifyListeners()
      }
    })

    this.channel.subscribe('cursor:leave', (message) => {
      this.cursors.delete(message.data.userId)
      this.notifyListeners()
    })
  }

  updateCursor(position: Omit<CursorPosition, 'userId' | 'userName' | 'timestamp'>): void {
    this.throttledUpdate(position)
  }

  private async publishCursor(position: Partial<CursorPosition>): Promise<void> {
    if (!this.channel) return

    await this.channel.publish('cursor:move', {
      ...position,
      timestamp: Date.now(),
    })
  }
}
```

#### 4.2 Typing Indicators
```typescript
// services/typing-indicator.service.ts
interface TypingState {
  userId: string
  userName: string
  cellId: string
  isTyping: boolean
  startedAt: number
}

class TypingIndicatorService {
  private typingUsers = new Map<string, TypingState>()
  private timeouts = new Map<string, NodeJS.Timeout>()
  private typingDuration = 3000 // Auto-clear after 3s of inactivity

  setTyping(cellId: string, isTyping: boolean): void {
    const channel = this.getChannel()
    if (!channel) return

    channel.publish('typing', {
      userId: currentUserId,
      userName: currentUserName,
      cellId,
      isTyping,
      startedAt: Date.now(),
    })
  }

  getTypingUsers(cellId: string): TypingState[] {
    return Array.from(this.typingUsers.values())
      .filter(t => t.cellId === cellId && t.isTyping)
  }
}
```

### 5. Real-time Analytics

#### 5.1 Presence Analytics
```typescript
// services/presence-analytics.service.ts
interface PresenceSession {
  userId: string
  boardId: string
  startTime: Date
  endTime?: Date
  duration?: number
  actionsCount: number
}

interface PresenceMetrics {
  totalViewers: number
  uniqueViewersToday: number
  averageSessionDuration: number
  peakConcurrentUsers: number
  mostActiveUsers: Array<{ userId: string; actions: number }>
}

class PresenceAnalyticsService {
  private sessions = new Map<string, PresenceSession>()

  trackJoin(userId: string, boardId: string): void {
    const sessionId = `${userId}:${boardId}`
    this.sessions.set(sessionId, {
      userId,
      boardId,
      startTime: new Date(),
      actionsCount: 0,
    })
  }

  trackLeave(userId: string, boardId: string): void {
    const sessionId = `${userId}:${boardId}`
    const session = this.sessions.get(sessionId)
    if (session) {
      session.endTime = new Date()
      session.duration = session.endTime.getTime() - session.startTime.getTime()
      // Store to database
      this.persistSession(session)
    }
  }

  trackAction(userId: string, boardId: string): void {
    const sessionId = `${userId}:${boardId}`
    const session = this.sessions.get(sessionId)
    if (session) {
      session.actionsCount++
    }
  }

  async getMetrics(boardId: string, period: 'day' | 'week' | 'month'): Promise<PresenceMetrics> {
    // Query aggregated metrics from database
    return {} as PresenceMetrics
  }
}
```

### 6. Channel Management

#### 6.1 Channel Factory
```typescript
// lib/ably/channel-factory.ts
type ChannelType = 'board' | 'cursor' | 'notification' | 'activity'

interface ChannelConfig {
  type: ChannelType
  params?: Record<string, string>
  history?: { minutes: number }
}

class ChannelFactory {
  private channels = new Map<string, Ably.RealtimeChannel>()

  getOrCreate(name: string, config: ChannelConfig): Ably.RealtimeChannel {
    if (this.channels.has(name)) {
      return this.channels.get(name)!
    }

    const client = connectionManager.getClient()
    if (!client) throw new Error('Ably not connected')

    const channelOptions: Ably.ChannelOptions = {
      params: config.params,
    }

    if (config.history) {
      channelOptions.params = {
        ...channelOptions.params,
        rewind: `${config.history.minutes}m`,
      }
    }

    const channel = client.channels.get(name, channelOptions)
    this.channels.set(name, channel)

    return channel
  }

  release(name: string): void {
    const channel = this.channels.get(name)
    if (channel) {
      channel.detach()
      this.channels.delete(name)
    }
  }

  releaseAll(): void {
    this.channels.forEach(channel => channel.detach())
    this.channels.clear()
  }
}

export const channelFactory = new ChannelFactory()
```

### 7. Testing Utilities

#### 7.1 Ably Mock for Testing
```typescript
// __mocks__/ably.ts
import { vi } from 'vitest'

export const mockChannel = {
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  publish: vi.fn().mockResolvedValue(undefined),
  presence: {
    enter: vi.fn().mockResolvedValue(undefined),
    leave: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue([]),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  },
}

export const mockAblyClient = {
  connection: {
    state: 'connected',
    id: 'mock-connection-id',
    on: vi.fn(),
  },
  channels: {
    get: vi.fn().mockReturnValue(mockChannel),
  },
  close: vi.fn(),
}

export class Realtime {
  constructor() {
    return mockAblyClient
  }
}
```

## New Folder Structure

```
apps/web/src/
├── lib/
│   └── ably/
│       ├── index.ts
│       ├── connection-manager.ts
│       ├── channel-factory.ts
│       ├── message-queue.ts
│       ├── conflict-resolution.ts
│       └── operational-transform.ts
├── features/
│   └── realtime/
│       ├── services/
│       │   ├── cursor-presence.service.ts
│       │   ├── typing-indicator.service.ts
│       │   └── presence-analytics.service.ts
│       ├── hooks/
│       │   ├── useAblyConnection.ts
│       │   ├── useCursorPresence.ts
│       │   └── useTypingIndicator.ts
│       └── components/
│           ├── ConnectionStatus.tsx
│           ├── PresenceAvatars.tsx
│           └── CursorOverlay.tsx
└── __mocks__/
    └── ably.ts
```

## Implementation Priority

### Phase 1: Reliability
1. Implement robust connection manager
2. Add reconnection strategy
3. Create message queue for offline support

### Phase 2: Conflict Handling
1. Add versioning to updates
2. Implement last-write-wins resolution
3. Add conflict UI indicators

### Phase 3: Enhanced Features
1. Add cursor sharing
2. Implement typing indicators
3. Add presence analytics

### Phase 4: Testing
1. Create Ably mocks
2. Add integration tests
3. Add E2E collaboration tests

## Success Metrics

| Metric | Target |
|--------|--------|
| Connection recovery rate | >95% |
| Message delivery rate | >99% |
| Average sync latency | <100ms |
| Offline queue capacity | 100 messages |
| Connection stability | <1 disconnect/hour |

## Dependencies
- ably (already installed)
- @upstash/redis (optional, for persistence)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Message ordering issues | Add sequence numbers |
| Network instability | Robust reconnection, offline queue |
| Conflicting edits | Clear conflict UI, auto-resolution |
| Ably outages | Fallback to polling |
