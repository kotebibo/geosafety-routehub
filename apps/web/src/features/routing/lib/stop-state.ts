// Visit state of a route stop, driven by check-in/out:
//   pending  — not started (no check-in)
//   in_progress — checked in, not yet out (yellow)
//   done — checked out / visited (green)
export type StopVisitState = 'pending' | 'in_progress' | 'done'

export function stopVisitState(status: string | null | undefined): StopVisitState {
  if (status === 'in_progress') return 'in_progress'
  if (status === 'visited' || status === 'completed') return 'done'
  return 'pending'
}

/** Hex marker/dot color per state (for the map). */
export const STOP_STATE_HEX: Record<StopVisitState, string> = {
  pending: '#9CA3AF', // grey
  in_progress: '#F59E0B', // amber (in progress)
  done: '#22C55E', // green (done)
}

/** Tailwind text/bg classes per state (for list rows / badges). */
export const STOP_STATE_CLASS: Record<StopVisitState, string> = {
  pending: 'bg-bg-tertiary text-text-tertiary',
  in_progress: 'bg-amber-500/15 text-amber-500 border border-amber-500/30',
  done: 'bg-green-500/15 text-green-600 border border-green-500/30',
}
