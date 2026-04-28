/**
 * BOG (Bank of Georgia) Business Online API types
 * Two separate DTOs: todayactivities (Original API) and statement/v2 (Statement New API)
 */

import { z } from 'zod'

// ============================================================
// OAuth2 Token (Keycloak)
// ============================================================

export const bogTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string().default('Bearer'),
  expires_in: z.number(), // seconds (300 = 5 min)
})

export type BogTokenResponse = z.infer<typeof bogTokenResponseSchema>

// ============================================================
// Today Activities endpoint (Original API)
// GET /api/documents/todayactivities/{IBAN}/{CCY}
// Returns: bare array []
// ============================================================

export const bogTodayActivitySchema = z.object({
  DocKey: z.string(),
  EntryDate: z.string(),
  DocDate: z.string().optional().nullable(),
  Credit: z.number().default(0),
  Debit: z.number().default(0),
  Currency: z.string().default('GEL'),
  Sender: z.string().optional().nullable(),
  SenderInn: z.string().optional().nullable(),
  SenderAccountNumber: z.string().optional().nullable(),
  Receiver: z.string().optional().nullable(),
  ReceiverAccountNumber: z.string().optional().nullable(),
  Nomination: z.string().optional().nullable(),
  DocumentNumber: z.string().optional().nullable(),
  OperationCode: z.string().optional().nullable(),
})

export type BogTodayActivity = z.infer<typeof bogTodayActivitySchema>

// Response is a bare array
export const bogTodayActivitiesResponseSchema = z.array(bogTodayActivitySchema)

// ============================================================
// Statement V2 endpoint (Statement New API)
// GET /api/statement/v2/{IBAN}/{CCY}/{fromDate}/{toDate}
// Returns: { Id, Count, Records: [...] }
// ============================================================

export const bogStatementRecordSchema = z.object({
  DocumentKey: z.string(),
  EntryDate: z.string(),
  DocumentDate: z.string().optional().nullable(),
  EntryAmountCredit: z.number().default(0),
  EntryAmountDebit: z.number().default(0),
  Currency: z.string().default('GEL'),
  SenderDetails: z.string().optional().nullable(),
  SenderInn: z.string().optional().nullable(),
  SenderAccountNumber: z.string().optional().nullable(),
  ReceiverDetails: z.string().optional().nullable(),
  ReceiverAccountNumber: z.string().optional().nullable(),
  DocumentNomination: z.string().optional().nullable(),
  DocumentNumber: z.string().optional().nullable(),
  OperationCode: z.string().optional().nullable(),
})

export type BogStatementRecord = z.infer<typeof bogStatementRecordSchema>

export const bogStatementResponseSchema = z.object({
  Id: z.number(),
  Count: z.number(),
  Records: z.array(bogStatementRecordSchema).default([]),
})

export type BogStatementResponse = z.infer<typeof bogStatementResponseSchema>

// Statement page response (for paginated requests)
export const bogStatementPageResponseSchema = z.object({
  Count: z.number(),
  Records: z.array(bogStatementRecordSchema).default([]),
})

// ============================================================
// Unified internal type (both endpoints normalize to this)
// ============================================================

export interface BankTransactionInsert {
  doc_key: string
  entry_date: string
  doc_date: string | null
  amount: number
  currency: string
  sender_name: string | null
  sender_inn: string | null
  sender_account: string | null
  receiver_account: string | null
  purpose: string | null
  raw_data: Record<string, unknown>
}

export interface PaymentStats {
  total_transactions: number
  total_amount: number
  matched_count: number
  unmatched_count: number
  ignored_count: number
  match_rate: number // percentage
}

export interface UnmatchedTransaction {
  id: string
  doc_key: string
  entry_date: string
  amount: number
  currency: string
  sender_name: string | null
  sender_inn: string | null
  purpose: string | null
  suggested_companies: SuggestedMatch[]
}

export interface SuggestedMatch {
  company_id: string
  company_name: string
  confidence: number
  reason: string // 'tax_id_partial', 'name_similar', 'purpose_mention'
}
