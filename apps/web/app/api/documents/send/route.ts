/**
 * @swagger
 * /api/documents/send:
 *   post:
 *     summary: Send a generated document via email
 *     tags: [Documents]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documentId
 *               - to
 *               - subject
 *             properties:
 *               documentId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the generated document to send
 *               to:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *                 minItems: 1
 *                 description: Recipient email addresses
 *               subject:
 *                 type: string
 *                 maxLength: 200
 *                 description: Email subject line
 *               message:
 *                 type: string
 *                 maxLength: 2000
 *                 description: Optional email body message
 *     responses:
 *       200:
 *         description: Email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Document not found
 *       500:
 *         description: Failed to send email
 *       503:
 *         description: Email service not configured (RESEND_API_KEY missing)
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/middleware/auth'
import { sendEmail } from '@/lib/email'
import { z } from 'zod'

const sendSchema = z.object({
  documentId: z.string().uuid(),
  to: z.array(z.string().email()).min(1),
  subject: z.string().min(1).max(200),
  message: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const supabase = createServerClient()
    const body = await request.json()
    const { documentId, to, subject, message } = sendSchema.parse(body)

    // Fetch generated document record
    const { data: doc, error: docError } = await supabase
      .from('generated_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Download the generated file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('attachments')
      .download(doc.file_path)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to download document' }, { status: 500 })
    }

    const fileBuffer = Buffer.from(await fileData.arrayBuffer())

    // Detect content type from file extension
    const ext = doc.file_name?.substring(doc.file_name.lastIndexOf('.')).toLowerCase() || '.docx'
    const CONTENT_TYPES: Record<string, string> = {
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
    }
    const attachmentContentType =
      CONTENT_TYPES[ext] ||
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    // Build email HTML
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://routehub.vercel.app'
    const messageHtml = message
      ? `<p style="color:#374151;line-height:1.6;white-space:pre-wrap;">${message}</p>`
      : ''

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#6161FF;color:white;padding:24px;border-radius:12px 12px 0 0;">
      <h1 style="margin:0;font-size:20px;">RouteHub</h1>
    </div>
    <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;">
      <h2 style="margin:0 0 16px;color:#111;">${subject}</h2>
      ${messageHtml}
      <p style="color:#6b7280;font-size:14px;margin-top:16px;">
        დოკუმენტი თანდართულია ამ წერილზე.
      </p>
    </div>
    <div style="padding:16px;text-align:center;font-size:12px;color:#9ca3af;">
      <p>RouteHub</p>
    </div>
  </div>
</body></html>`

    const text = [subject, '', message || '', '', 'დოკუმენტი თანდართულია ამ წერილზე.'].join('\n')

    // Send email with attachment via Resend
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Email not configured (RESEND_API_KEY missing)' },
        { status: 503 }
      )
    }

    // Documents go out from the instance's company sender (e.g. the
    // director's address on the company's Resend-verified domain).
    // Notifications and other system emails keep the RouteHub default.
    const sent = await sendEmail({
      to,
      subject,
      text,
      html,
      from: process.env.DOCUMENT_EMAIL_FROM || undefined,
      attachments: [
        {
          filename: doc.file_name,
          content: fileBuffer,
          contentType: attachmentContentType,
        },
      ],
    })

    if (!sent) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    // Update generated_documents record
    await supabase
      .from('generated_documents')
      .update({
        emailed_to: to,
        emailed_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Document send error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
