// Append a routing change-history entry (who/when/what). Fire-and-forget — an
// audit failure must never break the action it records. Writes via the service
// client, which the callers already hold.
export async function logRoutingAudit(
  svc: any,
  entry: {
    actorId: string | null
    inspectorId?: string | null
    action: string
    entity?: string
    weekStart?: string | null
    detail?: Record<string, any>
  }
): Promise<void> {
  try {
    await svc.from('routing_audit_log').insert({
      actor_id: entry.actorId,
      inspector_id: entry.inspectorId ?? null,
      action: entry.action,
      entity: entry.entity ?? null,
      week_start: entry.weekStart ?? null,
      detail: entry.detail ?? {},
    })
  } catch (err) {
    console.error('logRoutingAudit failed:', err)
  }
}
