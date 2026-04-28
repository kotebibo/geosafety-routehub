/**
 * BOG (Bank of Georgia) Business Online API client
 * Auth: Keycloak OAuth2 client_credentials with Basic auth header
 * Two API families:
 *   - todayactivities (Original) — bare array response
 *   - statement/v2 (Statement New) — paginated { Id, Count, Records }
 */

import {
  bogTokenResponseSchema,
  bogTodayActivitiesResponseSchema,
  bogStatementResponseSchema,
  bogStatementPageResponseSchema,
} from './types'
import type { BogTodayActivity, BogStatementRecord } from './types'

const BOG_AUTH_URL =
  process.env.BOG_AUTH_URL || 'https://account.bog.ge/auth/realms/bog/protocol/openid-connect/token'
const BOG_API_BASE = process.env.BOG_API_BASE_URL || 'https://api.businessonline.ge'
const BOG_CLIENT_ID = process.env.BOG_CLIENT_ID || ''
const BOG_CLIENT_SECRET = process.env.BOG_CLIENT_SECRET || ''
const BOG_IBAN = process.env.BOG_IBAN || ''
const BOG_CURRENCY = process.env.BOG_CURRENCY || 'GEL'

// Token cache (5 min expiry, refresh 30s early)
let cachedToken: string | null = null
let tokenExpiresAt = 0

/**
 * Get OAuth2 access token via Keycloak (cached until expiry)
 * Uses Basic auth: base64(client_id:client_secret)
 */
async function getAccessToken(): Promise<string> {
  const now = Date.now()

  if (cachedToken && now < tokenExpiresAt - 30_000) {
    return cachedToken
  }

  const basicAuth = Buffer.from(`${BOG_CLIENT_ID}:${BOG_CLIENT_SECRET}`).toString('base64')

  const response = await fetch(BOG_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`BOG OAuth2 token request failed (${response.status}): ${text}`)
  }

  const data = bogTokenResponseSchema.parse(await response.json())
  cachedToken = data.access_token
  tokenExpiresAt = now + data.expires_in * 1000

  return cachedToken
}

/**
 * Make authenticated request to BOG API
 */
async function bogFetch(path: string, options?: RequestInit): Promise<Response> {
  const token = await getAccessToken()

  const response = await fetch(`${BOG_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`BOG API error (${response.status}): ${text}`)
  }

  return response
}

/**
 * Get today's account activities (credit transactions)
 * Endpoint: GET /api/documents/todayactivities/{IBAN}/{CCY}
 * Returns: bare array of transactions
 */
export async function getTodayActivities(): Promise<BogTodayActivity[]> {
  const response = await bogFetch(`/api/documents/todayactivities/${BOG_IBAN}/${BOG_CURRENCY}`)
  const data = bogTodayActivitiesResponseSchema.parse(await response.json())
  // Filter to credits only
  return data.filter(t => t.Credit > 0)
}

/**
 * Get account statement for a date range
 * Endpoint: GET /api/statement/v2/{IBAN}/{CCY}/{fromDate}/{toDate}
 * Returns: { Id, Count, Records } — may need pagination for large ranges
 *
 * Pagination: first call returns statement Id + first page.
 * Subsequent pages: GET /api/statement/v2/{Id}/{pageNumber}
 */
export async function getStatementForRange(
  fromDate: string,
  toDate: string
): Promise<BogStatementRecord[]> {
  // Initial request — generates statement and returns first page
  const response = await bogFetch(
    `/api/statement/v2/${BOG_IBAN}/${BOG_CURRENCY}/${fromDate}/${toDate}`
  )
  const firstPage = bogStatementResponseSchema.parse(await response.json())

  const allRecords: BogStatementRecord[] = [...firstPage.Records]
  const totalCount = firstPage.Count
  const statementId = firstPage.Id

  // Paginate if there are more records (each page has ~Records.length items)
  // Pages are 1-indexed, first page was already returned
  if (firstPage.Records.length > 0 && allRecords.length < totalCount) {
    let pageNum = 2
    while (allRecords.length < totalCount) {
      const pageResponse = await bogFetch(`/api/statement/v2/${statementId}/${pageNum}`)
      const page = bogStatementPageResponseSchema.parse(await pageResponse.json())

      if (page.Records.length === 0) break
      allRecords.push(...page.Records)
      pageNum++
    }
  }

  // Filter to credits only
  return allRecords.filter(r => r.EntryAmountCredit > 0)
}

/**
 * Check if BOG credentials are configured
 */
export function isBogConfigured(): boolean {
  return !!(BOG_CLIENT_ID && BOG_CLIENT_SECRET && BOG_IBAN)
}

export const bogClient = {
  getAccessToken,
  getTodayActivities,
  getStatementForRange,
  isBogConfigured,
}
