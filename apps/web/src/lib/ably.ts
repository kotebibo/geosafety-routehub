import Ably from 'ably'

let ablyClient: Ably.Realtime | null = null

// Get Ably API key directly from process.env to avoid importing env.ts
// which would throw on missing Supabase variables
function getAblyApiKey(): string | undefined {
  if (typeof window !== 'undefined') {
    // Client-side: use NEXT_PUBLIC_ prefix
    return process.env.NEXT_PUBLIC_ABLY_API_KEY
  }
  return process.env.NEXT_PUBLIC_ABLY_API_KEY
}

/**
 * Get or create Ably client instance (singleton)
 */
export function getAblyClient(): Ably.Realtime | null {
  if (typeof window === 'undefined') {
    return null // Server-side, no Ably
  }

  const apiKey = getAblyApiKey()
  if (!apiKey) {
    console.warn('Ably API key not configured. Real-time features disabled.')
    return null
  }

  if (!ablyClient) {
    ablyClient = new Ably.Realtime({
      key: apiKey,
      clientId: `user-${Date.now()}`, // Will be overridden when we have user info
      echoMessages: false, // Don't echo messages back to sender
    })

    ablyClient.connection.on('connected', () => {
      console.log('Ably connected')
    })

    ablyClient.connection.on('disconnected', () => {
      console.log('Ably disconnected')
    })

    ablyClient.connection.on('failed', (err) => {
      console.error('Ably connection failed:', err)
    })
  }

  return ablyClient
}

/**
 * Update the client ID (call after user authentication)
 */
export function setAblyClientId(userId: string) {
  const apiKey = getAblyApiKey()
  if (ablyClient && apiKey) {
    // Create new client with user ID
    ablyClient.close()
    ablyClient = new Ably.Realtime({
      key: apiKey,
      clientId: userId,
      echoMessages: false,
    })
  }
}

/**
 * Close Ably connection
 */
export function closeAblyConnection() {
  if (ablyClient) {
    ablyClient.close()
    ablyClient = null
  }
}

/**
 * Check if Ably is available
 */
export function isAblyAvailable(): boolean {
  return !!getAblyApiKey()
}
