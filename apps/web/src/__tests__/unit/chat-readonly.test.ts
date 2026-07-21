/**
 * Read-only guarantees of the AI assistant.
 *
 * The assistant must never gain a write path. These tests enforce that at two
 * levels: the readonly-db module's runtime whitelist, and a static scan of the
 * assistant's source files that fails the suite if a write verb ever appears
 * outside the chat-history persistence (the user's own conversations).
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, it, expect, beforeAll } from 'vitest'

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

function source(relPath: string): string {
  return readFileSync(path.join(webRoot, relPath), 'utf-8')
}

const WRITE_VERBS = ['.insert(', '.upsert(', '.update(', '.delete(']

/** Tables the chat route is allowed to write: the user's own chat history. */
const ALLOWED_WRITE_TABLES = ['chat_conversations', 'chat_messages']

describe('readonly-db runtime wall', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://stub.supabase.co'
    process.env.SUPABASE_SERVICE_KEY ||= 'stub-service-key'
  })

  it('rejects RPCs that are not whitelisted as read-only', async () => {
    const { roRpc } = await import('@/lib/chat/readonly-db')
    expect(() => roRpc('exec_sql', { query: 'DROP TABLE companies' })).toThrow(/not whitelisted/)
    expect(() => roRpc('delete_board')).toThrow(/not whitelisted/)
  })

  it('allows the whitelisted read-only RPC', async () => {
    const { roRpc } = await import('@/lib/chat/readonly-db')
    expect(() => roRpc('get_payment_stats')).not.toThrow()
  })

  it('exposes no write helpers', async () => {
    const readonlyDb = await import('@/lib/chat/readonly-db')
    expect(Object.keys(readonlyDb).sort()).toEqual(['roRpc', 'roSelect'])
  })
})

describe('assistant source contains no write paths (static guard)', () => {
  it('readonly-db and the financial analytics service never write', () => {
    for (const file of [
      'src/lib/chat/readonly-db.ts',
      'src/services/financial-analytics.service.ts',
    ]) {
      const code = source(file)
      for (const verb of WRITE_VERBS) {
        expect(code.includes(verb), `${file} must not contain "${verb}"`).toBe(false)
      }
    }
  })

  it('the chat route only writes to the chat history tables', () => {
    const code = source('app/api/chat/route.ts')
    for (const verb of WRITE_VERBS) {
      let index = code.indexOf(verb)
      while (index !== -1) {
        // Each write must belong to a statement that reads from a chat_* table:
        // find the nearest preceding .from('<table>') in the same chain.
        const windowBefore = code.slice(Math.max(0, index - 400), index)
        const fromMatches = [...windowBefore.matchAll(/\.from\('([^']+)'\)/g)]
        const nearestTable = fromMatches[fromMatches.length - 1]?.[1]
        expect(
          nearestTable && ALLOWED_WRITE_TABLES.includes(nearestTable),
          `write verb "${verb}" at offset ${index} targets "${nearestTable}" — ` +
            'the assistant may only write its own chat history'
        ).toBe(true)
        index = code.indexOf(verb, index + 1)
      }
    }
  })

  it('every chat endpoint requires admin authorization', () => {
    for (const file of [
      'app/api/chat/route.ts',
      'app/api/chat/conversations/route.ts',
      'app/api/chat/conversations/[id]/route.ts',
    ]) {
      expect(source(file).includes('requireAdmin('), `${file} must call requireAdmin`).toBe(true)
    }
  })

  it('the system prompt declares the assistant read-only', () => {
    expect(source('app/api/chat/route.ts')).toContain('READ-ONLY')
  })
})
