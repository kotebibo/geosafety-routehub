/**
 * Email templates for notification types.
 * All templates return { subject, text, html } for use with sendEmail().
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://routehub.vercel.app'

function wrapHtml(title: string, body: string, ctaUrl?: string, ctaText?: string): string {
  const ctaBlock =
    ctaUrl && ctaText
      ? `<a href="${ctaUrl}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#6161FF;color:white;text-decoration:none;border-radius:8px;font-size:14px;">${ctaText}</a>`
      : ''

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#6161FF;color:white;padding:20px 24px;border-radius:12px 12px 0 0;">
      <h1 style="margin:0;font-size:18px;">RouteHub</h1>
    </div>
    <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
      <h2 style="margin:0 0 16px;color:#111;font-size:16px;">${title}</h2>
      ${body}
      ${ctaBlock}
    </div>
    <div style="padding:12px;text-align:center;font-size:11px;color:#9ca3af;">
      <p style="margin:0;">RouteHub — შეტყობინებების მართვა შეგიძლიათ პარამეტრებში</p>
    </div>
  </div>
</body></html>`
}

function p(text: string): string {
  return `<p style="color:#374151;line-height:1.6;margin:0 0 12px;">${text}</p>`
}

export interface NotificationEmailData {
  type: string
  title: string
  message: string
  data?: Record<string, any>
}

export function generateNotificationEmail(notification: NotificationEmailData): {
  subject: string
  text: string
  html: string
} {
  const { type, title, message, data = {} } = notification

  switch (type) {
    case 'item_mention': {
      const boardUrl = data.board_id ? `${APP_URL}/boards/${data.board_id}` : APP_URL
      return {
        subject: `${data.mentioned_by || 'ვიღაცამ'} მოგნიშნათ კომენტარში`,
        text: `${title}\n\n${message}\n\nნახე: ${boardUrl}`,
        html: wrapHtml(title, p(message), boardUrl, 'კომენტარის ნახვა'),
      }
    }

    case 'item_comment': {
      const boardUrl = data.board_id ? `${APP_URL}/boards/${data.board_id}` : APP_URL
      return {
        subject: `ახალი კომენტარი: ${data.item_name || ''}`,
        text: `${title}\n\n${message}\n\nნახე: ${boardUrl}`,
        html: wrapHtml(title, p(message), boardUrl, 'კომენტარის ნახვა'),
      }
    }

    case 'board_shared': {
      const boardUrl = data.board_id ? `${APP_URL}/boards/${data.board_id}` : APP_URL
      return {
        subject: `დაფა გაგიზიარეს: ${data.board_name || ''}`,
        text: `${title}\n\n${message}\n\nნახე: ${boardUrl}`,
        html: wrapHtml(
          title,
          p(message) + (data.role ? p(`როლი: <strong>${data.role}</strong>`) : ''),
          boardUrl,
          'დაფის ნახვა'
        ),
      }
    }

    case 'announcement_new': {
      return {
        subject: `სიახლე: ${data.announcement_title || title}`,
        text: `${title}\n\n${message}\n\nნახე: ${APP_URL}/news`,
        html: wrapHtml(title, p(message), `${APP_URL}/news`, 'სიახლის ნახვა'),
      }
    }

    case 'item_overdue': {
      const daysText =
        data.days_remaining === 0 ? 'ვადა ამოიწურა' : `ვადის გასვლამდე ${data.days_remaining} დღე`
      const boardUrl = data.board_id
        ? `${APP_URL}/boards/${data.board_id}${data.item_id ? `?item=${data.item_id}` : ''}`
        : APP_URL
      return {
        subject: `${data.item_name || title} — ${daysText}`,
        text: `${title}\n\n${message}\n\nნახე: ${boardUrl}`,
        html: wrapHtml(title, p(message) + p(`<strong>${daysText}</strong>`), boardUrl, 'ნახვა'),
      }
    }

    default: {
      return {
        subject: title,
        text: `${title}\n\n${message}\n\nნახე: ${APP_URL}`,
        html: wrapHtml(title, p(message), APP_URL, 'RouteHub-ში ნახვა'),
      }
    }
  }
}
