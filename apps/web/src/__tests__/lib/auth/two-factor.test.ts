import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'node:crypto'

// --- Fake login_2fa_challenges table ---
// Supports just enough of the Postgrest chain shape that twoFactor.ts uses:
// select().eq().eq().is().order().limit().maybeSingle(), update(patch).eq()...,
// and insert(payload).select('id').single().

function hashSecret(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function createFakeChallengesClient(initialRows: any[] = []) {
  let rows = [...initialRows]
  let seq = 0

  function makeChain(op: 'select' | 'update' | 'insert', payload?: any) {
    const filters: [string, any][] = []
    const chain: any = {
      eq: (col: string, val: any) => {
        filters.push([col, val])
        return chain
      },
      is: (col: string, val: any) => {
        filters.push([col, val])
        return chain
      },
      order: () => chain,
      limit: () => chain,
    }

    const matched = () =>
      rows
        .filter(r => filters.every(([col, val]) => r[col] === val))
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

    if (op === 'select') {
      chain.maybeSingle = () => Promise.resolve({ data: matched()[0] ?? null, error: null })
    }

    if (op === 'update') {
      chain.then = (resolve: any) => {
        rows = rows.map(r =>
          filters.every(([col, val]) => r[col] === val) ? { ...r, ...payload } : r
        )
        return Promise.resolve({ data: null, error: null }).then(resolve)
      }
    }

    if (op === 'insert') {
      chain.select = () => chain
      chain.single = () => {
        const row = {
          id: `challenge-${++seq}`,
          attempt_count: 0,
          resend_count: 0,
          consumed_at: null,
          created_at: new Date(2025, 0, 1, 0, 0, seq).toISOString(),
          ...payload,
        }
        rows.push(row)
        return Promise.resolve({ data: { id: row.id }, error: null })
      }
    }

    return chain
  }

  return {
    client: {
      from: (table: string) => {
        if (table !== 'login_2fa_challenges') throw new Error(`unexpected table ${table}`)
        return {
          select: () => makeChain('select'),
          update: (payload: any) => makeChain('update', payload),
          insert: (payload: any) => makeChain('insert', payload),
        }
      },
    },
    getRows: () => rows,
  }
}

let fake = createFakeChallengesClient()

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => fake.client,
}))

import {
  createChallenge,
  verifyLoginChallengeByCookie,
  verifyLoginChallengeByLinkToken,
  verifyEnrollChallenge,
  findUserIdForPendingLoginCookie,
  MAX_VERIFY_ATTEMPTS,
} from '@/lib/auth/twoFactor'

const USER_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5'

describe('twoFactor service', () => {
  beforeEach(() => {
    fake = createFakeChallengesClient()
  })

  it('createChallenge issues a code/link/cookie and stores only hashes', async () => {
    const issued = await createChallenge({ userId: USER_ID, purpose: 'login' })

    expect(issued.code).toMatch(/^\d{6}$/)
    expect(issued.linkToken).toBeTruthy()
    expect(issued.cookieToken).toBeTruthy()

    const row = fake.getRows()[0]
    expect(row.code_hash).toBe(hashSecret(issued.code))
    expect(row.code_hash).not.toBe(issued.code)
    expect(row.cookie_token_hash).toBe(hashSecret(issued.cookieToken!))
  })

  it('createChallenge for enroll purpose issues no cookie token', async () => {
    const issued = await createChallenge({ userId: USER_ID, purpose: 'enroll' })
    expect(issued.cookieToken).toBeNull()
  })

  it('createChallenge invalidates a prior un-consumed challenge for the same user+purpose', async () => {
    const first = await createChallenge({ userId: USER_ID, purpose: 'login' })
    await createChallenge({ userId: USER_ID, purpose: 'login' })

    const firstRow = fake
      .getRows()
      .find(r => r.cookie_token_hash === hashSecret(first.cookieToken!))
    expect(firstRow.consumed_at).not.toBeNull()

    // The old code must no longer verify.
    const result = await verifyLoginChallengeByCookie(first.cookieToken!, first.code)
    expect(result.ok).toBe(false)
  })

  it('verifyLoginChallengeByCookie succeeds with the correct code and burns the challenge', async () => {
    const issued = await createChallenge({ userId: USER_ID, purpose: 'login' })

    const result = await verifyLoginChallengeByCookie(issued.cookieToken!, issued.code)
    expect(result).toEqual({ ok: true, userId: USER_ID })

    // Replay with the same correct code must now fail — already consumed.
    const replay = await verifyLoginChallengeByCookie(issued.cookieToken!, issued.code)
    expect(replay.ok).toBe(false)
  })

  it('verifyLoginChallengeByCookie fails and increments attempts on a wrong code', async () => {
    const issued = await createChallenge({ userId: USER_ID, purpose: 'login' })

    const result = await verifyLoginChallengeByCookie(issued.cookieToken!, '000000')
    expect(result).toEqual({ ok: false, reason: 'invalid_code' })
    expect(fake.getRows()[0].attempt_count).toBe(1)
  })

  it('locks out after MAX_VERIFY_ATTEMPTS wrong codes, even if the next guess is correct', async () => {
    const issued = await createChallenge({ userId: USER_ID, purpose: 'login' })

    for (let i = 0; i < MAX_VERIFY_ATTEMPTS; i++) {
      const result = await verifyLoginChallengeByCookie(issued.cookieToken!, '000000')
      expect(result.ok).toBe(false)
    }

    const finalTry = await verifyLoginChallengeByCookie(issued.cookieToken!, issued.code)
    expect(finalTry).toEqual({ ok: false, reason: 'locked' })
  })

  it('verifyLoginChallengeByCookie fails for an expired challenge', async () => {
    const issued = await createChallenge({ userId: USER_ID, purpose: 'login' })
    fake.getRows()[0].expires_at = new Date(Date.now() - 1000).toISOString()

    const result = await verifyLoginChallengeByCookie(issued.cookieToken!, issued.code)
    expect(result).toEqual({ ok: false, reason: 'expired' })
  })

  it('verifyLoginChallengeByCookie fails for an unknown cookie token', async () => {
    const result = await verifyLoginChallengeByCookie('not-a-real-token', '123456')
    expect(result).toEqual({ ok: false, reason: 'not_found' })
  })

  it('verifyLoginChallengeByLinkToken succeeds and burns the same row the code would', async () => {
    const issued = await createChallenge({ userId: USER_ID, purpose: 'login' })

    const result = await verifyLoginChallengeByLinkToken(issued.linkToken)
    expect(result).toEqual({ ok: true, userId: USER_ID })

    // The code path is now dead too — same row, same consumed_at.
    const codeAttempt = await verifyLoginChallengeByCookie(issued.cookieToken!, issued.code)
    expect(codeAttempt.ok).toBe(false)
  })

  it('verifyEnrollChallenge verifies by user_id+purpose without needing a cookie', async () => {
    const issued = await createChallenge({ userId: USER_ID, purpose: 'enroll' })

    const wrong = await verifyEnrollChallenge(USER_ID, '000000')
    expect(wrong.ok).toBe(false)

    const right = await verifyEnrollChallenge(USER_ID, issued.code)
    expect(right).toEqual({ ok: true, userId: USER_ID })
  })

  it('findUserIdForPendingLoginCookie resolves without consuming the challenge', async () => {
    const issued = await createChallenge({ userId: USER_ID, purpose: 'login' })

    const resolvedUserId = await findUserIdForPendingLoginCookie(issued.cookieToken!)
    expect(resolvedUserId).toBe(USER_ID)

    // Challenge must still be usable — lookup alone shouldn't burn it.
    const result = await verifyLoginChallengeByCookie(issued.cookieToken!, issued.code)
    expect(result.ok).toBe(true)
  })

  it('findUserIdForPendingLoginCookie returns null for an unknown or expired cookie', async () => {
    expect(await findUserIdForPendingLoginCookie('unknown')).toBeNull()

    const issued = await createChallenge({ userId: USER_ID, purpose: 'login' })
    fake.getRows()[0].expires_at = new Date(Date.now() - 1000).toISOString()
    expect(await findUserIdForPendingLoginCookie(issued.cookieToken!)).toBeNull()
  })
})
