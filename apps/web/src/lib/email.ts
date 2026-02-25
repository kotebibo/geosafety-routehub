import nodemailer from 'nodemailer'

function createTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    return null
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  })
}

export interface EmailOptions {
  to: string | string[]
  subject: string
  text: string
  html?: string
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const transporter = createTransporter()

  if (!transporter) {
    console.warn('Email skipped — SMTP not configured')
    return false
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@geosafety.ge',
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    })
    return true
  } catch (error) {
    console.error('Email send failed:', error)
    return false
  }
}

export function generateAnnouncementEmail(announcement: {
  title: string
  content: string
  priority: string
  author_name: string
}) {
  const priorityPrefix = announcement.priority === 'urgent'
    ? '🚨 '
    : announcement.priority === 'important'
      ? '⚠️ '
      : ''

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://routehub.geosafety.ge'

  const text = [
    `${priorityPrefix}${announcement.title}`,
    '',
    announcement.content,
    '',
    '---',
    `გამოაქვეყნა: ${announcement.author_name}`,
    `ნახე RouteHub-ში: ${appUrl}/news`,
  ].join('\n')

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#6161FF;color:white;padding:24px;border-radius:12px 12px 0 0;">
      <h1 style="margin:0;font-size:20px;">სიახლე — RouteHub</h1>
    </div>
    <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;">
      ${announcement.priority !== 'normal' ? `<span style="display:inline-block;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:bold;background:${announcement.priority === 'urgent' ? '#fee2e2;color:#991b1b' : '#fef3c7;color:#92400e'};">${priorityPrefix}${announcement.priority === 'urgent' ? 'სასწრაფო' : 'მნიშვნელოვანი'}</span><br><br>` : ''}
      <h2 style="margin:0 0 16px;color:#111;">${announcement.title}</h2>
      <p style="color:#374151;line-height:1.6;white-space:pre-wrap;">${announcement.content}</p>
      <a href="${appUrl}/news" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#6161FF;color:white;text-decoration:none;border-radius:8px;">ნახე RouteHub-ში</a>
    </div>
    <div style="padding:16px;text-align:center;font-size:12px;color:#9ca3af;">
      <p>გამოაქვეყნა: ${announcement.author_name}</p>
      <p>GeoSafety RouteHub</p>
    </div>
  </div>
</body></html>`

  return { text, html }
}
