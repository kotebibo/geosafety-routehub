// Ably is lazy-loaded to reduce initial bundle size (~300KB)
import type Ably from 'ably'

let ablyClient: Ably.Realtime | null = null
let ablyModule: typeof import('ably') | null = null
let loadPromise: Promise<typeof import('ably')> | null = null

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
 * Lazy load the Ably module
 */
async function loadAbly(): Promise<typeof import('ably')> {
  if (ablyModule) return ablyModule
  if (loadPromise) return loadPromise

  loadPromise = import('ably').then((mod) => {
    ablyModule = mod
    return mod
  })

  return loadPromise
}

/**
 * Get or create Ably client instance (singleton)
 * Now synchronous but requires ensureAblyLoaded() to be called first for real-time features
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

  // If module not loaded yet, return null (caller should use ensureAblyLoaded first)
  if (!ablyModule) {
    return null
  }

  if (!ablyClient) {
    ablyClient = new ablyModule.Realtime({
      key: apiKey,
      clientId: `user-${Date.now()}`, // Will be overridden when we have user info
      echoMessages: false, // Don't echo messages back to sender
    })

    ablyClient.connection.on('connected', () => {
      // Connection established
    })

    ablyClient.connection.on('disconnected', () => {
      // Connection lost
    })

    ablyClient.connection.on('failed', (err) => {
      console.error('Ably connection failed:', err)
    })
  }

  return ablyClient
}

/**
 * Ensure Ably is loaded before using real-time features
 * Call this in useEffect when entering a board
 */
export async function ensureAblyLoaded(): Promise<Ably.Realtime | null> {
  if (typeof window === 'undefined') return null
  if (!getAblyApiKey()) return null

  await loadAbly()
  return getAblyClient()
}

/**
 * Update the client ID (call after user authentication)
 */
export async function setAblyClientId(userId: string) {
  const apiKey = getAblyApiKey()
  if (!apiKey) return

  await loadAbly()

  if (ablyClient && ablyModule) {
    // Create new client with user ID
    ablyClient.close()
    ablyClient = new ablyModule.Realtime({
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
 * Check if Ably is available (API key configured)
 */
export function isAblyAvailable(): boolean {
  return !!getAblyApiKey()
}

/**
 * Check if Ably module is loaded
 */
export function isAblyLoaded(): boolean {
  return !!ablyModule
}
