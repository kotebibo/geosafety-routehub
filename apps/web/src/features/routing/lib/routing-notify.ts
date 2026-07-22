import { notifyUsers } from '@/lib/notify'

/**
 * Notify all managers (admins + dispatchers) in-app, and optionally by email.
 * Used for routing events: plan submitted, extra-visit requested, stop deferred.
 * Fire-and-forget — never throws into the caller's request path.
 */
export async function notifyManagers(
  svc: any,
  opts: {
    type: string
    title: string
    message: string
    data?: Record<string, any>
    email?: boolean
  }
): Promise<void> {
  try {
    const { data: roles } = await svc
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'dispatcher'])
    const ids = [...new Set((roles || []).map((r: any) => r.user_id).filter(Boolean))] as string[]
    if (ids.length === 0) return
    await notifyUsers(
      svc,
      ids,
      opts.type,
      opts.title,
      opts.message,
      opts.data ?? {},
      opts.email ?? false
    )
  } catch (err) {
    console.error('notifyManagers failed:', err)
  }
}
