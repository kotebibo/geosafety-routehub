/**
 * Canonical board types live in @/types/board — this module re-exports them
 * so existing feature-relative imports keep working. Do NOT define board
 * types here; the two copies diverged once and it cost real debugging time.
 */
export * from '@/types/board'
