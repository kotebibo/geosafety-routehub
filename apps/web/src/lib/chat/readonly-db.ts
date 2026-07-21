/**
 * Read-only data access for the AI assistant.
 *
 * The assistant must never write. This module is the only way chat tools may
 * touch the service-role connection: it exposes SELECT queries and a whitelist
 * of read-only RPCs — there is no path to insert/update/delete/upsert.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let service: SupabaseClient | null = null

function getService(): SupabaseClient {
  if (!service) {
    service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  }
  return service
}

/** SELECT from a table with service-role privileges. Chainable filters only. */
export function roSelect(
  table: string,
  columns: string,
  opts?: { count?: 'exact'; head?: boolean }
) {
  return getService().from(table).select(columns, opts)
}

const READONLY_RPCS = new Set(['get_payment_stats'])

/** Call a whitelisted read-only RPC with service-role privileges. */
export function roRpc(fn: string, args?: Record<string, unknown>) {
  if (!READONLY_RPCS.has(fn)) {
    throw new Error(`RPC "${fn}" is not whitelisted as read-only for the assistant`)
  }
  return getService().rpc(fn, args)
}
