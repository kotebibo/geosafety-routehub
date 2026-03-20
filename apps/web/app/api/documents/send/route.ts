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

    // Send email with attachment using nodemailer directly (sendEmail doesn't support attachments)
    const nodemailer = require('nodemailer')
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      return NextResponse.json(
        { error: 'Email not configured (SMTP settings missing)' },
        { status: 503 }
      )
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@routehub.app',
      to: to.join(', '),
      subject,
      text,
      html,
      attachments: [
        {
          filename: doc.file_name,
          content: fileBuffer,
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      ],
    })

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
